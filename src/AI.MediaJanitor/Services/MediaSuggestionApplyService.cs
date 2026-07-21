using AI.MediaJanitor.Models;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace AI.MediaJanitor.Services;

public class MediaSuggestionApplyService : IMediaSuggestionApplyService
{
    private static readonly string[] AltAliases =
    {
        "altText",
        "alternativeText",
        "alt",
        "altTekst",
    };

    private static readonly string[] CaptionAliases =
    {
        "caption",
        "imageCaption",
    };

    private readonly IMediaService _mediaService;
    private readonly IMediaFolderService _folderService;
    private readonly ILogger<MediaSuggestionApplyService> _logger;

    public MediaSuggestionApplyService(
        IMediaService mediaService,
        IMediaFolderService folderService,
        ILogger<MediaSuggestionApplyService> logger)
    {
        _mediaService = mediaService;
        _folderService = folderService;
        _logger = logger;
    }

    public Task<ApplySuggestionResult> ApplyAsync(
        ApplySuggestionRequest request,
        int userId,
        CancellationToken ct)
    {
        var media = _mediaService.GetById(request.MediaKey);
        if (media is null)
        {
            return Task.FromResult(new ApplySuggestionResult
            {
                MediaKey = request.MediaKey,
                Success = false,
                ErrorMessage = "Media item not found.",
            });
        }

        var applied = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Name) && request.Name != media.Name)
        {
            media.Name = request.Name;
            applied.Add("name");
        }

        if (request.AltText is not null
            && TrySetFirstMatchingProperty(media, AltAliases, request.AltText))
        {
            applied.Add("altText");
        }

        if (request.Caption is not null
            && TrySetFirstMatchingProperty(media, CaptionAliases, request.Caption))
        {
            applied.Add("caption");
        }

        // Folder move. A new-folder request takes precedence over an existing-folder
        // key. Both paths re-validate against the live tree, so a folder deleted or
        // moved between analyze and apply produces a friendly error, not a crash.
        if (!string.IsNullOrWhiteSpace(request.NewFolderName))
        {
            var moved = TryCreateFolderAndMove(request, media, userId, out var failure);
            if (failure is not null)
                return Task.FromResult(failure);
            if (moved)
                applied.Add("folder");
        }
        else if (request.TargetFolderKey is { } folderKey)
        {
            var moved = TryMoveToExisting(request, media, folderKey, userId, out var failure);
            if (failure is not null)
                return Task.FromResult(failure);
            if (moved)
                applied.Add("folder");
        }

        if (applied.Count == 0)
        {
            return Task.FromResult(new ApplySuggestionResult
            {
                MediaKey = request.MediaKey,
                Success = true,
                AppliedFields = Array.Empty<string>(),
            });
        }

        var saveResult = _mediaService.Save(media, userId);
        if (!saveResult.Success)
        {
            _logger.LogWarning("Saving media {Key} failed: {Result}", media.Key, saveResult.Result);
            return Task.FromResult(new ApplySuggestionResult
            {
                MediaKey = request.MediaKey,
                Success = false,
                ErrorMessage = $"Save failed: {saveResult.Result}",
            });
        }

        return Task.FromResult(new ApplySuggestionResult
        {
            MediaKey = request.MediaKey,
            Success = true,
            AppliedFields = applied.ToArray(),
        });
    }

    private static bool TrySetFirstMatchingProperty(IMedia media, string[] aliases, string value)
    {
        foreach (var alias in aliases)
        {
            if (!media.HasProperty(alias))
                continue;
            media.SetValue(alias, value);
            return true;
        }

        return false;
    }

    /// <summary>
    /// Creates the requested new folder (validating its parent) and moves the item
    /// into it. Returns true when a move happened; sets <paramref name="failure"/>
    /// and returns false on any validation/persistence error.
    /// </summary>
    private bool TryCreateFolderAndMove(
        ApplySuggestionRequest request,
        IMedia media,
        int userId,
        out ApplySuggestionResult? failure)
    {
        failure = null;

        var parentId = UmbracoConstants.System.Root;
        if (request.NewFolderParentKey is { } parentKey)
        {
            var parent = _mediaService.GetById(parentKey);
            if (parent is null)
            {
                failure = Fail(request.MediaKey, "Parent folder for the new folder was not found.");
                return false;
            }

            if (!_folderService.IsFolder(parent))
            {
                failure = Fail(request.MediaKey, "Parent for the new folder is not a media folder.");
                return false;
            }

            parentId = parent.Id;
        }

        var newFolder = _mediaService.CreateMedia(
            request.NewFolderName!.Trim(),
            parentId,
            _folderService.FolderMediaTypeAlias);

        var folderSave = _mediaService.Save(newFolder, userId);
        if (!folderSave.Success)
        {
            _logger.LogWarning("Creating folder {Name} failed: {Result}", request.NewFolderName, folderSave.Result);
            failure = Fail(request.MediaKey, $"Could not create folder: {folderSave.Result}");
            return false;
        }

        _mediaService.Move(media, newFolder.Id, userId);
        return true;
    }

    /// <summary>
    /// Validates an existing target folder and moves the item into it. Returns true
    /// when a move happened (false for a no-op move to the current parent); sets
    /// <paramref name="failure"/> and returns false on validation error.
    /// </summary>
    private bool TryMoveToExisting(
        ApplySuggestionRequest request,
        IMedia media,
        Guid folderKey,
        int userId,
        out ApplySuggestionResult? failure)
    {
        failure = null;

        var folder = _mediaService.GetById(folderKey);
        if (folder is null)
        {
            failure = Fail(request.MediaKey, "Target folder not found.");
            return false;
        }

        if (!_folderService.IsFolder(folder))
        {
            failure = Fail(request.MediaKey, "Target is not a media folder.");
            return false;
        }

        if (folder.Id == media.Id)
        {
            failure = Fail(request.MediaKey, "Cannot move an item into itself.");
            return false;
        }

        // folder.Path is the comma-separated id trail ("-1,1001,1042"). If it
        // contains the item's id, the target sits below the item we are moving.
        if (folder.Path.Split(',').Contains(media.Id.ToString()))
        {
            failure = Fail(request.MediaKey, "Cannot move an item into its own descendant.");
            return false;
        }

        if (folder.Id == media.ParentId)
            return false; // already there — nothing to move

        _mediaService.Move(media, folder.Id, userId);
        return true;
    }

    private static ApplySuggestionResult Fail(Guid mediaKey, string message) => new()
    {
        MediaKey = mediaKey,
        Success = false,
        ErrorMessage = message,
    };
}
