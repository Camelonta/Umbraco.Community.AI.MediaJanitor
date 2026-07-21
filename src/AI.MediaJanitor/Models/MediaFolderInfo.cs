namespace AI.MediaJanitor.Models;

/// <summary>
/// A media folder in the tree, flattened for grounding AI suggestions and
/// populating the override picker.
/// </summary>
public class MediaFolderInfo
{
    public required Guid Key { get; init; }
    public required int Id { get; init; }
    public required int ParentId { get; init; }
    public required string Name { get; init; }

    /// <summary>Slash-joined ancestor names including this folder, e.g. <c>/products/shoes</c>.</summary>
    public required string DisplayPath { get; init; }
}
