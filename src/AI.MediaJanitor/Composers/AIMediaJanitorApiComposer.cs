using AI.MediaJanitor.Configuration;
using AI.MediaJanitor.Services;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Api.Common.OpenApi;

namespace AI.MediaJanitor.Composers
{
    public class AIMediaJanitorApiComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            // Bind options from appsettings (Umbraco:CMS:AIMediaJanitor)
            builder.Services
                .AddOptions<MediaJanitorOptions>()
                .BindConfiguration(MediaJanitorOptions.SectionName);

            // Register Media Janitor services. The host site is responsible for
            // registering an IChatClient (e.g. via Umbraco.AI.OpenAI / .Anthropic).
            builder.Services.AddScoped<IMediaCandidateService, MediaCandidateService>();
            builder.Services.AddScoped<IMediaFolderService, MediaFolderService>();
            builder.Services.AddScoped<IMediaAnalysisService, MediaAnalysisService>();
            builder.Services.AddScoped<IMediaSuggestionApplyService, MediaSuggestionApplyService>();

            // Dedicated OpenAPI document for this package, used to generate the TypeScript client.
            // https://docs.umbraco.com/umbraco-cms/tutorials/creating-a-backoffice-api
            builder.AddBackOfficeOpenApiDocument(Constants.ApiName, document => document
                .WithTitle("AIMedia Janitor Backoffice API")
                .WithBackOfficeAuthentication());
        }
    }
}
