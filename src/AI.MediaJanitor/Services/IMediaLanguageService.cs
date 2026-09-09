using AI.MediaJanitor.Models;

namespace AI.MediaJanitor.Services;

public interface IMediaLanguageService
{
    /// <summary>
    /// Returns every language configured in Umbraco, sorted with the default
    /// language first, then alphabetically by name.
    /// </summary>
    public Task<IReadOnlyList<MediaLanguageInfo>> GetLanguagesAsync(CancellationToken ct);
}
