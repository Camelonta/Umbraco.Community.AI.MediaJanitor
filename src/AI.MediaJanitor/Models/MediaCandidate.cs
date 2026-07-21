namespace AI.MediaJanitor.Models;

/// <summary>
/// A media item that the assistant flagged as a candidate for review.
/// </summary>
public class MediaCandidate
{
    public required Guid Key { get; init; }
    public required string Name { get; init; }
    public string? CurrentAltText { get; init; }
    public string? FolderPath { get; init; }
    public string? ThumbnailUrl { get; init; }
    public string? MediaTypeAlias { get; init; }

    /// <summary>True if no alt text is set on the media item.</summary>
    public bool MissingAlt { get; init; }

    /// <summary>True if the file name looks generic (e.g. <c>IMG_1234</c>).</summary>
    public bool PoorName { get; init; }
}

public class CandidatePage
{
    public required IReadOnlyList<MediaCandidate> Items { get; init; }
    public required int Total { get; init; }
}
