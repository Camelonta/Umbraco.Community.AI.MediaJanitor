namespace AI.MediaJanitor.Models;

public class MediaAnalysisRequest
{
    public required Guid MediaKey { get; init; }

    /// <summary>BCP-47 language tag for the suggested text. Falls back to
    /// <see cref="Configuration.MediaJanitorOptions.DefaultLanguage"/> when null.</summary>
    public string? Language { get; init; }
}
