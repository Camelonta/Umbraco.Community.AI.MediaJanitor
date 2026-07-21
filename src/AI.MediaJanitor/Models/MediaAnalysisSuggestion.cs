using System.Text.Json.Serialization;

namespace AI.MediaJanitor.Models;

/// <summary>
/// The shape returned to the editor — wraps the model's payload with the
/// media key so the UI can correlate it.
/// </summary>
public class MediaAnalysisSuggestion
{
    public required Guid MediaKey { get; init; }
    public string? Name { get; init; }
    public string? AltText { get; init; }
    public string? Caption { get; init; }
    public FolderSuggestion? Folder { get; init; }
    public bool Uncertain { get; init; }
    public string? Note { get; init; }

    /// <summary>Key of the folder the item currently lives in (null when at the media root).</summary>
    public Guid? CurrentFolderKey { get; init; }

    /// <summary>Display path of the folder the item currently lives in, e.g. <c>/products</c>.</summary>
    public string? CurrentFolderPath { get; init; }
}

/// <summary>
/// Internal: the JSON shape we ask the model for. Field names match the
/// schema embedded in the prompt — do not rename without updating the prompt.
/// </summary>
internal class MediaAnalysisPayload
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("alt")]
    public string? AltText { get; set; }

    [JsonPropertyName("caption")]
    public string? Caption { get; set; }

    [JsonPropertyName("folder_index")]
    public int? FolderIndex { get; set; }

    [JsonPropertyName("folder_new_name")]
    public string? FolderNewName { get; set; }

    [JsonPropertyName("folder_reason")]
    public string? FolderReason { get; set; }

    [JsonPropertyName("uncertain")]
    public bool Uncertain { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>
/// A grounded folder suggestion. Either points at an existing folder
/// (<see cref="TargetFolderKey"/>) or proposes a new one (<see cref="NewFolderName"/>).
/// </summary>
public class FolderSuggestion
{
    /// <summary>Existing folder the AI recommends moving into (null when proposing a new folder).</summary>
    public Guid? TargetFolderKey { get; init; }

    /// <summary>Display path of the existing target folder.</summary>
    public string? TargetPath { get; init; }

    /// <summary>Name of a new folder to create when no existing folder fits.</summary>
    public string? NewFolderName { get; init; }

    public string? Reason { get; init; }

    /// <summary>True when the suggestion differs from the item's current folder.</summary>
    public bool IsChange { get; init; }
}
