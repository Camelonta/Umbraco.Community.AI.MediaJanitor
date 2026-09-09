using AI.MediaJanitor.Models;
using Umbraco.Cms.Core.Services;

namespace AI.MediaJanitor.Services;

public class MediaLanguageService : IMediaLanguageService
{
    private readonly ILanguageService _languageService;

    public MediaLanguageService(ILanguageService languageService)
    {
        _languageService = languageService;
    }

    public async Task<IReadOnlyList<MediaLanguageInfo>> GetLanguagesAsync(CancellationToken ct)
    {
        var languages = await _languageService.GetAllAsync();

        return languages
            .Select(l => new MediaLanguageInfo
            {
                IsoCode = l.IsoCode,
                Name = l.CultureName,
                IsDefault = l.IsDefault,
            })
            .OrderByDescending(l => l.IsDefault)
            .ThenBy(l => l.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
