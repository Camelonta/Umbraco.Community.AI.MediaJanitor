namespace AI.MediaJanitor.Models;

/// <summary>
/// What the editor accepted from the suggestion. Each field is opt-in so the
/// editor can take e.g. only the alt text and skip the rename.
/// </summary>
public class ApplySuggestionRequest
{
    public required Guid MediaKey { get; init; }
    public string? Name { get; init; }
    public string? AltText { get; init; }
    public string? Caption { get; init; }

    /// <summary>Optional folder key (existing media folder) to move the item into.</summary>
    public Guid? TargetFolderKey { get; init; }

    /// <summary>
    /// Optional name of a new folder to create and move the item into. Takes
    /// precedence over <see cref="TargetFolderKey"/> when both are set.
    /// </summary>
    public string? NewFolderName { get; init; }

    /// <summary>Parent for the new folder named in <see cref="NewFolderName"/>. Null = media root.</summary>
    public Guid? NewFolderParentKey { get; init; }
}

public class ApplySuggestionResult
{
    public required Guid MediaKey { get; init; }
    public required bool Success { get; init; }
    public string[]? AppliedFields { get; init; }
    public string? ErrorMessage { get; init; }
}
