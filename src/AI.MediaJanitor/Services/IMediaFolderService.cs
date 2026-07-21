using AI.MediaJanitor.Models;
using Umbraco.Cms.Core.Models;

namespace AI.MediaJanitor.Services;

public interface IMediaFolderService
{
    /// <summary>
    /// Returns every media folder in the tree, flattened and sorted by
    /// <see cref="MediaFolderInfo.DisplayPath"/>.
    /// </summary>
    IReadOnlyList<MediaFolderInfo> GetFolders(CancellationToken ct);

    /// <summary>Media type ids that are (or compose) the built-in Folder type.</summary>
    HashSet<int> GetFolderMediaTypeIds();

    /// <summary>True if the media item is a folder media type.</summary>
    bool IsFolder(IMedia media);

    /// <summary>Alias used when creating a new folder media item.</summary>
    string FolderMediaTypeAlias { get; }
}
