using AI.MediaJanitor.Models;

namespace AI.MediaJanitor.Services;

public interface IMediaAnalysisService
{
    /// <summary>
    /// Sends an image to the configured AI chat client and parses a strictly-
    /// structured suggestion. Throws if the model returns non-JSON or fails
    /// the safety post-validation.
    /// </summary>
    Task<MediaAnalysisSuggestion> AnalyzeAsync(MediaAnalysisRequest request, CancellationToken ct);
}
