using AI.MediaJanitor.Configuration;
using AI.MediaJanitor.Models;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace AI.MediaJanitor.Services;

public class MediaCandidateService : IMediaCandidateService
{
    private static readonly string[] AltAliases =
    {
        "altText",
        "alternativeText",
        "alt",
        "altTekst",
    };

    private readonly IMediaService _mediaService;
    private readonly IMediaTypeService _mediaTypeService;
    private readonly MediaJanitorOptions _options;

    public MediaCandidateService(
        IMediaService mediaService,
        IMediaTypeService mediaTypeService,
        IOptions<MediaJanitorOptions> options)
    {
        _mediaService = mediaService;
        _mediaTypeService = mediaTypeService;
        _options = options.Value;
    }

    public Task<CandidatePage> GetCandidatesAsync(
        bool missingAlt,
        bool poorName,
        int skip,
        int take,
        CancellationToken ct)
    {
        take = Math.Clamp(take, 1, _options.MaxPageSize);
        skip = Math.Max(0, skip);

        var imageTypeIds = GetImageMediaTypeIds();
        var all = new List<MediaCandidate>();
        const int pageSize = 200;
        long pageIndex = 0;
        long total;
        do
        {
            ct.ThrowIfCancellationRequested();

            var batch = _mediaService.GetPagedDescendants(
                UmbracoConstants.System.Root,
                pageIndex,
                pageSize,
                out total);

            foreach (IMedia media in batch)
            {
                if (!imageTypeIds.Contains(media.ContentTypeId))
                    continue;

                bool hasAlt = HasAltText(media);
                bool isPoor = IsPoorName(media.Name);

                bool include =
                    (!missingAlt && !poorName) ||
                    (missingAlt && !hasAlt) ||
                    (poorName && isPoor);

                if (!include)
                    continue;

                all.Add(new MediaCandidate
                {
                    Key = media.Key,
                    Name = media.Name ?? string.Empty,
                    CurrentAltText = ReadAlt(media),
                    FolderPath = BuildFolderPath(media),
                    MediaTypeAlias = media.ContentType.Alias,
                    MissingAlt = !hasAlt,
                    PoorName = isPoor,
                });
            }

            pageIndex++;
        } while (pageIndex * pageSize < total);

        var paged = all
            .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .Skip(skip)
            .Take(take)
            .ToList();

        return Task.FromResult(new CandidatePage
        {
            Items = paged,
            Total = all.Count,
        });
    }

    private HashSet<int> GetImageMediaTypeIds()
    {
        var imageAlias = UmbracoConstants.Conventions.MediaTypes.Image;
        return _mediaTypeService.GetAll()
            .Where(mt =>
                string.Equals(mt.Alias, imageAlias, StringComparison.OrdinalIgnoreCase)
                || mt.CompositionAliases().Any(a => a.Equals(imageAlias, StringComparison.OrdinalIgnoreCase)))
            .Select(mt => mt.Id)
            .ToHashSet();
    }

    private static bool HasAltText(IMedia media) => ReadAlt(media) is not null;

    private static string? ReadAlt(IMedia media)
    {
        foreach (var alias in AltAliases)
        {
            if (!media.HasProperty(alias))
                continue;
            var value = media.GetValue<string>(alias);
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return null;
    }

    private bool IsPoorName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return true;

        var trimmed = name.Trim();
        foreach (var prefix in _options.PoorNamePrefixes)
        {
            if (trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        if (trimmed.Length < 4)
            return true;
        var digits = trimmed.Count(char.IsDigit);
        if (digits > 0 && (double)digits / trimmed.Length > 0.6)
            return true;

        return false;
    }

    private string BuildFolderPath(IMedia media)
    {
        var ancestors = new Stack<string>();
        var parentId = media.ParentId;
        var safety = 0;
        while (parentId > 0 && safety++ < 32)
        {
            var parent = _mediaService.GetById(parentId);
            if (parent is null)
                break;
            ancestors.Push(parent.Name ?? string.Empty);
            parentId = parent.ParentId;
        }

        return ancestors.Count == 0 ? "/" : "/" + string.Join("/", ancestors);
    }
}
