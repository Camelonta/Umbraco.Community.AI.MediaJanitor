using AI.MediaJanitor.Models;

namespace AI.MediaJanitor.Services;

public interface IMediaSuggestionApplyService
{
    Task<ApplySuggestionResult> ApplyAsync(ApplySuggestionRequest request, int userId, CancellationToken ct);
}
