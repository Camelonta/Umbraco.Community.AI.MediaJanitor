namespace AI.MediaJanitor.Models;

/// <summary>
/// An Umbraco content language, offered as a response-language choice in the
/// analyse dropdown.
/// </summary>
public class MediaLanguageInfo
{
    /// <summary>BCP-47 / ISO culture code, e.g. <c>en-US</c>.</summary>
    public required string IsoCode { get; init; }

    public required string Name { get; init; }

    public required bool IsDefault { get; init; }
}
