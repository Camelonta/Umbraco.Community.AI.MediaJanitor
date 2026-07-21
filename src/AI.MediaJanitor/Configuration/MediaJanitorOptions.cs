namespace AI.MediaJanitor.Configuration;

/// <summary>
/// Editor-controlled tuning for the AI Media Assistant.
/// Bind from <c>Umbraco:CMS:AIMediaJanitor</c> in <c>appsettings.json</c>.
/// </summary>
public class MediaJanitorOptions
{
    public const string SectionName = "Umbraco:CMS:AIMediaJanitor";

    /// <summary>
    /// Default response language when the image gives no clear language signal.
    /// </summary>
    public string DefaultLanguage { get; set; } = "en";

    /// <summary>
    /// Maximum bytes of image data forwarded to the model. Larger images are
    /// rejected up front to keep cost predictable.
    /// </summary>
    public int MaxImageBytes { get; set; } = 8 * 1024 * 1024;

    /// <summary>
    /// Names that count as "poor / generic" when scanning for candidates
    /// (case-insensitive prefix match).
    /// </summary>
    public string[] PoorNamePrefixes { get; set; } =
    {
        "img_",
        "image",
        "dsc",
        "dsc_",
        "screenshot",
        "untitled",
        "photo",
        "pasted",
        "scan",
    };

    /// <summary>
    /// Maximum candidates returned per page from the candidates endpoint.
    /// </summary>
    public int MaxPageSize { get; set; } = 50;

    /// <summary>
    /// Optional Umbraco.AI Profile alias to route analysis through. When null
    /// or empty the default profile is used.
    /// </summary>
    public string? ProfileAlias { get; set; }

    /// <summary>
    /// Telemetry / auditing label passed to <c>AIChatBuilder.WithAlias</c>.
    /// Required by Umbraco.AI even when no profile is selected.
    /// </summary>
    public string ChatAlias { get; set; } = "media-janitor";

    /// <summary>
    /// When true, the assistant lists existing media folders in the analysis
    /// prompt and suggests moving the image to a better-fitting folder.
    /// </summary>
    public bool SuggestFolderMove { get; set; } = true;

    /// <summary>
    /// Maximum number of folders listed in the analysis prompt. Caps token cost
    /// on very large media trees.
    /// </summary>
    public int MaxFoldersInPrompt { get; set; } = 200;
}
