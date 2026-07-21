using AI.MediaJanitor.Models;
using AI.MediaJanitor.Services;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security;

namespace AI.MediaJanitor.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "AI.MediaJanitor")]
public class AIMediaJanitorMediaApiController : AIMediaJanitorApiControllerBase
{
    private readonly IMediaCandidateService _candidates;
    private readonly IMediaFolderService _folders;
    private readonly IMediaAnalysisService _analysis;
    private readonly IMediaSuggestionApplyService _apply;
    private readonly IBackOfficeSecurityAccessor _security;

    public AIMediaJanitorMediaApiController(
        IMediaCandidateService candidates,
        IMediaFolderService folders,
        IMediaAnalysisService analysis,
        IMediaSuggestionApplyService apply,
        IBackOfficeSecurityAccessor security)
    {
        _candidates = candidates;
        _folders = folders;
        _analysis = analysis;
        _apply = apply;
        _security = security;
    }

    [HttpGet("candidates")]
    [ProducesResponseType<CandidatePage>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CandidatePage>> GetCandidates(
        [FromQuery] bool missingAlt = true,
        [FromQuery] bool poorName = true,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken ct = default)
    {
        var page = await _candidates.GetCandidatesAsync(missingAlt, poorName, skip, take, ct);
        return Ok(page);
    }

    [HttpGet("folders")]
    [ProducesResponseType<IEnumerable<MediaFolderInfo>>(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<MediaFolderInfo>> GetFolders(CancellationToken ct)
        => Ok(_folders.GetFolders(ct));

    [HttpPost("analyze")]
    [ProducesResponseType<MediaAnalysisSuggestion>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MediaAnalysisSuggestion>> Analyze(
        [FromBody] MediaAnalysisRequest request,
        CancellationToken ct)
    {
        try
        {
            var suggestion = await _analysis.AnalyzeAsync(request, ct);
            return Ok(suggestion);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("apply")]
    [ProducesResponseType<ApplySuggestionResult>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApplySuggestionResult>> Apply(
        [FromBody] ApplySuggestionRequest request,
        CancellationToken ct)
    {
        var userId = _security.BackOfficeSecurity?.CurrentUser?.Id ?? -1;
        var result = await _apply.ApplyAsync(request, userId, ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
