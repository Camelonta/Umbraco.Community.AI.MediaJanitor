using AI.MediaJanitor.Models;

namespace AI.MediaJanitor.Services;

public interface IMediaCandidateService
{
    /// <summary>
    /// Returns image media items matching the requested criteria.
    /// </summary>
    /// <param name="missingAlt">Include items with no alt text.</param>
    /// <param name="poorName">Include items whose name looks generic.</param>
    Task<CandidatePage> GetCandidatesAsync(
        bool missingAlt,
        bool poorName,
        int skip,
        int take,
        CancellationToken ct);
}
