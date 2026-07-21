using System.Text;
using System.Text.Json;
using AI.MediaJanitor.Configuration;
using AI.MediaJanitor.Models;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.AI.Core.Chat;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors.ValueConverters;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace AI.MediaJanitor.Services;

public class MediaAnalysisService : IMediaAnalysisService
{
    /// <summary>
    /// JSON schema we describe to the model. We embed it as plain text in the
    /// user message so any provider can honour it — not every Umbraco.AI
    /// provider supports response_format=json_schema natively yet.
    /// </summary>
    private const string SchemaDescription = """
        {
          "name":            "<kebab-case file name, no extension, or null>",
          "alt":             "<short factual alt text, or null>",
          "caption":         "<one-sentence caption, or null>",
          "folder_index":    <index of the best existing folder from the list, or null>,
          "folder_new_name": "<kebab-case name for a NEW folder to create if none fit, or null>",
          "folder_reason":   "<one short sentence about the folder choice, or null>",
          "uncertain":       <true|false>,
          "note":            "<one short sentence about confidence, or null>"
        }
        """;

    private readonly IAIChatService _chatService;
    private readonly IMediaService _mediaService;
    private readonly IMediaFolderService _folderService;
    private readonly MediaFileManager _mediaFileManager;
    private readonly MediaJanitorOptions _options;
    private readonly ILogger<MediaAnalysisService> _logger;

    public MediaAnalysisService(
        IAIChatService chatService,
        IMediaService mediaService,
        IMediaFolderService folderService,
        MediaFileManager mediaFileManager,
        IOptions<MediaJanitorOptions> options,
        ILogger<MediaAnalysisService> logger)
    {
        _chatService = chatService;
        _mediaService = mediaService;
        _folderService = folderService;
        _mediaFileManager = mediaFileManager;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<MediaAnalysisSuggestion> AnalyzeAsync(
        MediaAnalysisRequest request,
        CancellationToken ct)
    {
        IChatClient chat;
        try
        {
            chat = await _chatService.CreateChatClientAsync(
                builder =>
                {
                    builder.WithAlias(_options.ChatAlias);
                    if (!string.IsNullOrWhiteSpace(_options.ProfileAlias))
                    {
                        builder.WithProfile(_options.ProfileAlias!);
                    }
                },
                ct);
        }
        catch (Exception ex)
        {
            // Umbraco.AI throws when no Connection or matching Profile exists.
            // Surface a friendly message that points the editor at the AI UI.
            _logger.LogWarning(ex, "Could not obtain chat client from Umbraco.AI.");
            throw new InvalidOperationException(
                "AI Media Assistant could not obtain a chat client. " +
                "Open the Umbraco backoffice → AI → Connections and create a connection " +
                "(e.g. OpenAI). If you set Umbraco:CMS:AIMediaJanitor:ProfileAlias in " +
                "appsettings.json, make sure a profile with that alias exists.", ex);
        }

        var media = _mediaService.GetById(request.MediaKey)
            ?? throw new InvalidOperationException($"Media {request.MediaKey} not found.");

        var (bytes, mediaType) = await ReadImageAsync(media, ct);
        if (bytes.Length > _options.MaxImageBytes)
        {
            throw new InvalidOperationException(
                $"Image is {bytes.Length} bytes, larger than the configured limit of {_options.MaxImageBytes}.");
        }

        var language = string.IsNullOrWhiteSpace(request.Language)
            ? _options.DefaultLanguage
            : request.Language!;

        // Folder grounding: give the model the real folder tree so it can pick an
        // existing folder by index rather than inventing an ungrounded name.
        var folders = _options.SuggestFolderMove
            ? _folderService.GetFolders(ct)
            : (IReadOnlyList<MediaFolderInfo>)Array.Empty<MediaFolderInfo>();

        var currentFolder = media.ParentId > 0
            ? folders.FirstOrDefault(f => f.Id == media.ParentId)
            : null;
        var currentFolderKey = currentFolder?.Key;
        var currentFolderPath = currentFolder?.DisplayPath ?? "/";

        var shownFolders = folders.Take(Math.Max(0, _options.MaxFoldersInPrompt)).ToList();

        var userText = new StringBuilder();
        userText.AppendLine("Analyse the attached image and return ONLY a JSON object with this shape:");
        userText.AppendLine(SchemaDescription);
        userText.AppendLine();
        userText.AppendLine($"Use language: {language}.");
        userText.AppendLine($"The current file name is \"{media.Name}\".");
        var existingAlt = ReadExistingAlt(media);
        if (!string.IsNullOrWhiteSpace(existingAlt))
        {
            userText.AppendLine(
                $"The editor already wrote this alt text: \"{existingAlt}\". " +
                "Only suggest a replacement if it is clearly better; otherwise return null for \"alt\".");
        }

        if (shownFolders.Count > 0)
        {
            userText.AppendLine();
            userText.AppendLine("Existing media folders (pick the ONE that best fits this image):");
            for (var i = 0; i < shownFolders.Count; i++)
            {
                userText.AppendLine($"{i + 1}: {shownFolders[i].DisplayPath}");
            }

            userText.AppendLine($"This image is currently in folder: {currentFolderPath}.");
            userText.AppendLine(
                "Set \"folder_index\" to the number of a clearly better folder, or null to leave it. " +
                "Only if NO listed folder is a good home, set \"folder_new_name\" to a short " +
                "kebab-case name for a new folder to create. Never set both.");
            if (folders.Count > shownFolders.Count)
            {
                userText.AppendLine(
                    $"(The list is capped at {shownFolders.Count} folders; if none fit, prefer null.)");
            }
        }

        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, Constants.Safety.SystemPrompt),
            new(ChatRole.User,
            [
                new TextContent(userText.ToString()),
                new DataContent(bytes, mediaType),
            ]),
        };

        var response = await chat.GetResponseAsync(
            messages,
            new ChatOptions
            {
                Temperature = 0.2f,
                ResponseFormat = ChatResponseFormat.Json,
            },
            ct);

        var text = response.Text ?? string.Empty;
        var json = ExtractJson(text);

        MediaAnalysisPayload payload;
        try
        {
            payload = JsonSerializer.Deserialize<MediaAnalysisPayload>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Empty suggestion.");
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Model returned non-JSON content: {Text}", text);
            throw new InvalidOperationException(
                "AI response was not valid JSON. Try again or pick a different model.", ex);
        }

        return new MediaAnalysisSuggestion
        {
            MediaKey = request.MediaKey,
            Name = SanitizeName(payload.Name),
            AltText = payload.AltText?.Trim(),
            Caption = payload.Caption?.Trim(),
            Folder = ResolveFolder(payload, shownFolders, currentFolderKey),
            Uncertain = payload.Uncertain,
            Note = payload.Note?.Trim(),
            CurrentFolderKey = currentFolderKey,
            CurrentFolderPath = currentFolderPath,
        };
    }

    /// <summary>
    /// Maps the model's folder choice back to a grounded suggestion. An index is
    /// resolved against the exact list shown to the model; anything out of range,
    /// or pointing at the item's current folder, yields no suggestion.
    /// </summary>
    private FolderSuggestion? ResolveFolder(
        MediaAnalysisPayload payload,
        IReadOnlyList<MediaFolderInfo> shownFolders,
        Guid? currentFolderKey)
    {
        if (payload.FolderIndex is int idx)
        {
            if (idx >= 1 && idx <= shownFolders.Count)
            {
                var target = shownFolders[idx - 1];
                if (target.Key == currentFolderKey)
                    return null; // already in the best folder

                return new FolderSuggestion
                {
                    TargetFolderKey = target.Key,
                    TargetPath = target.DisplayPath,
                    Reason = payload.FolderReason?.Trim(),
                    IsChange = true,
                };
            }

            _logger.LogWarning("Model returned out-of-range folder_index {Index}.", idx);
        }

        var newName = SanitizeName(payload.FolderNewName);
        if (!string.IsNullOrEmpty(newName))
        {
            return new FolderSuggestion
            {
                NewFolderName = newName,
                Reason = payload.FolderReason?.Trim(),
                IsChange = true,
            };
        }

        return null;
    }

    private static string? SanitizeName(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        // Allow ASCII letters, digits, dashes; collapse whitespace to dashes.
        var lowered = raw.Trim().ToLowerInvariant().Replace(' ', '-');
        var filtered = new string(lowered.Where(c => c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-').ToArray());
        // remove multiple dashes
        while (filtered.Contains("--"))
            filtered = filtered.Replace("--", "-");
        return string.IsNullOrEmpty(filtered) ? null : filtered.Trim('-');
    }

    private async Task<(byte[] Bytes, string MediaType)> ReadImageAsync(
        Umbraco.Cms.Core.Models.IMedia media,
        CancellationToken ct)
    {
        var raw = media.GetValue<string>(UmbracoConstants.Conventions.Media.File);
        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException("Media item has no file value.");
        }

        // Modern Image media type stores umbracoFile as ImageCropperValue JSON.
        // Older / custom types store the path as a plain string. Support both.
        string? path = null;
        var trimmed = raw.TrimStart();
        if (trimmed.StartsWith('{'))
        {
            try
            {
                var imageCropper = JsonSerializer.Deserialize<ImageCropperValue>(raw);
                path = imageCropper?.Src;
            }
            catch
            {
                // fall through to treating raw as a path
            }
        }

        path ??= raw;

        if (string.IsNullOrWhiteSpace(path))
        {
            throw new InvalidOperationException("Media item has no file path.");
        }

        await using var stream = _mediaFileManager.FileSystem.OpenFile(path);
        await using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);

        var ext = Path.GetExtension(path).TrimStart('.').ToLowerInvariant();
        var mediaType = ext switch
        {
            "jpg" or "jpeg" => "image/jpeg",
            "png" => "image/png",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "application/octet-stream",
        };

        return (ms.ToArray(), mediaType);
    }

    private static string? ReadExistingAlt(Umbraco.Cms.Core.Models.IMedia media)
    {
        foreach (var alias in new[] { "altText", "alternativeText", "alt", "altTekst" })
        {
            if (!media.HasProperty(alias))
                continue;
            var v = media.GetValue<string>(alias);
            if (!string.IsNullOrWhiteSpace(v))
                return v;
        }

        return null;
    }

    /// <summary>
    /// Defensive: some providers wrap JSON in fenced code blocks even when
    /// asked not to. Strip a single fence pair if present.
    /// </summary>
    private static string ExtractJson(string text)
    {
        var t = text.Trim();
        if (t.StartsWith("```"))
        {
            var firstNewline = t.IndexOf('\n');
            if (firstNewline >= 0)
                t = t[(firstNewline + 1)..];
            if (t.EndsWith("```"))
                t = t[..^3];
        }

        return t.Trim();
    }
}
