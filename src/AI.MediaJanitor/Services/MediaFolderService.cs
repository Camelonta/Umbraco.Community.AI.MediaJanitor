using AI.MediaJanitor.Models;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace AI.MediaJanitor.Services;

public class MediaFolderService : IMediaFolderService
{
    private readonly IMediaService _mediaService;
    private readonly IMediaTypeService _mediaTypeService;

    public MediaFolderService(IMediaService mediaService, IMediaTypeService mediaTypeService)
    {
        _mediaService = mediaService;
        _mediaTypeService = mediaTypeService;
    }

    public string FolderMediaTypeAlias => UmbracoConstants.Conventions.MediaTypes.Folder;

    public HashSet<int> GetFolderMediaTypeIds()
    {
        var folderAlias = UmbracoConstants.Conventions.MediaTypes.Folder;
        return _mediaTypeService.GetAll()
            .Where(mt =>
                string.Equals(mt.Alias, folderAlias, StringComparison.OrdinalIgnoreCase)
                || mt.CompositionAliases().Any(a => a.Equals(folderAlias, StringComparison.OrdinalIgnoreCase)))
            .Select(mt => mt.Id)
            .ToHashSet();
    }

    public bool IsFolder(IMedia media) => GetFolderMediaTypeIds().Contains(media.ContentTypeId);

    public IReadOnlyList<MediaFolderInfo> GetFolders(CancellationToken ct)
    {
        var folderTypeIds = GetFolderMediaTypeIds();

        // Collect every folder in a single pass. A folder's parent is always the
        // root or another folder, so we can compose display paths purely from this
        // lookup — no per-ancestor GetById (avoids the N+1 in BuildFolderPath).
        var byId = new Dictionary<int, (string Name, int ParentId, Guid Key)>();
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
                if (folderTypeIds.Contains(media.ContentTypeId))
                    byId[media.Id] = (media.Name ?? string.Empty, media.ParentId, media.Key);
            }

            pageIndex++;
        } while (pageIndex * pageSize < total);

        return byId
            .Select(kv => new MediaFolderInfo
            {
                Id = kv.Key,
                Key = kv.Value.Key,
                ParentId = kv.Value.ParentId,
                Name = kv.Value.Name,
                DisplayPath = BuildPath(kv.Key, byId),
            })
            .OrderBy(f => f.DisplayPath, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string BuildPath(int id, Dictionary<int, (string Name, int ParentId, Guid Key)> byId)
    {
        var segments = new Stack<string>();
        var current = id;
        var safety = 0;
        while (byId.TryGetValue(current, out var node) && safety++ < 64)
        {
            segments.Push(node.Name);
            current = node.ParentId;
        }

        return segments.Count == 0 ? "/" : "/" + string.Join("/", segments);
    }
}
