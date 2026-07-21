# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`Umbraco.Community.AI.MediaJanitor` — an Umbraco CMS v17+ package (targets **.NET 10**) that adds an "AI Media Assistant" to the backoffice Media section. It scans the media library for images with missing alt text or poor/generic file names, sends them to a vision-capable LLM (via Umbraco.AI) to generate alt text, captions, and cleaned-up names, and lets an editor review and apply the suggestions per row.

Distributed as a NuGet package. The C# assembly ships together with pre-built frontend assets in `wwwroot/App_Plugins/AIMediaJanitor/` (the `Client/` source folder is excluded from the package — see `AI.MediaJanitor.csproj`).

## Layout

Two projects under `src/` (solution: `src/AI.MediaJanitor.slnx`):

- **`AI.MediaJanitor/`** — the shippable package (Razor class library). Contains the backend (`Composers`, `Controllers`, `Services`, `Models`, `Configuration`), the frontend source (`Client/`), and the built output (`wwwroot/App_Plugins/AIMediaJanitor/`).
- **`AI.MediaJanitor.TestSite/`** — a local Umbraco host for development. References the package project and pulls in the actual Umbraco.AI provider packages (OpenAI, Anthropic, Google, etc.). Configured for **unattended install** — credentials are in `appsettings.json` under `Umbraco:CMS:Unattended` (admin@example.com / 1234567890).

The git repository root is one level above `src/` (contains `docs/`, `.github/`, `LICENSE`).

## Common commands

Run C# commands from `src/`, frontend commands from `src/AI.MediaJanitor/Client/`.

```bash
# Backend
dotnet build src/AI.MediaJanitor.slnx
dotnet run --project src/AI.MediaJanitor.TestSite       # dev site → https://localhost:44338 (backoffice at /umbraco)
dotnet pack src/AI.MediaJanitor/AI.MediaJanitor.csproj -c Release /p:Version=1.2.3   # produce the NuGet package

# Frontend (cd src/AI.MediaJanitor/Client first)
npm install
npm run build            # tsc typecheck + vite build → outputs to ../wwwroot/App_Plugins/AIMediaJanitor
npm run watch            # rebuild on change during development
npm run generate-client  # regenerate the TypeScript API client from the running site's swagger
```

There is **no test project** in the solution — verification is done manually against the TestSite.

**Release:** pushing a semver tag (e.g. `1.2.3`) triggers `.github/workflows/release.yml`, which packs and pushes to NuGet. Version comes from the tag via `/p:Version`.

## Architecture

### Request flow

Frontend workspace → backoffice API → services → Umbraco.AI. Three endpoints under `aimediajanitor/api/v1` (`Controllers/AIMediaJanitorMediaApiController.cs`):

1. **`GET candidates`** → `MediaCandidateService`. Pages through all media descendants, keeps only image-composed media types, flags each as `MissingAlt` and/or `PoorName`. Alt text is read across several possible property aliases (`altText`, `alternativeText`, `alt`, `altTekst`); "poor name" is prefix/heuristic based (config-driven prefixes, too-short, mostly-digits).
2. **`POST analyze`** → `MediaAnalysisService`. Reads the image bytes, builds a chat request, calls the LLM, parses the JSON response into a suggestion. Does **not** mutate anything.
3. **`POST apply`** → `MediaSuggestionApplyService`. Writes the chosen fields back onto the `IMedia` (name, alt, caption via alias matching; optional folder move) and saves.

### AI integration (the core)

`MediaAnalysisService` is where the LLM work happens. Key design decisions to preserve when editing:

- The chat client is obtained at request time via `IAIChatService.CreateChatClientAsync` (from **Umbraco.AI.Core**), configured with `WithAlias(options.ChatAlias)` and optionally `WithProfile(options.ProfileAlias)`. **This package does not register an LLM provider itself** — the host site must install e.g. `Umbraco.AI.OpenAI` and create a Connection/Profile in the backoffice AI section. When that's missing, Umbraco.AI throws; the service catches it and rethrows a friendly `InvalidOperationException` pointing the editor at the AI UI.
- The expected JSON output shape is described to the model **as plain text embedded in the user message** (`SchemaDescription`), not via native structured-output — because not every Umbraco.AI provider supports `response_format=json_schema`. The response is defensively unwrapped (`ExtractJson` strips code fences) before deserialization.
- The system prompt (`Constants.Safety.SystemPrompt`) is treated as **policy**: kept short, imperative, and byte-identical across calls. It forbids identifying individuals, inferring sensitive attributes, and overwriting existing editor metadata unless clearly better. Edit it deliberately.
- Image handling supports both modern (`ImageCropperValue` JSON in `umbracoFile`) and legacy (plain path string) media, reads via `MediaFileManager.FileSystem`, and enforces `MaxImageBytes` up front.

### Configuration

`MediaJanitorOptions` (`Configuration/`) binds from `Umbraco:CMS:AIMediaJanitor` in appsettings. Registered in `AIMediaJanitorApiComposer`. Tunables: `DefaultLanguage`, `MaxImageBytes`, `PoorNamePrefixes`, `MaxPageSize`, `ProfileAlias`, `ChatAlias`.

### Backoffice API conventions (Umbraco pattern)

- `AIMediaJanitorApiControllerBase` sets the shared route (`BackOfficeRoute("aimediajanitor/api/v{version:apiVersion}")`), the `SectionAccessMedia` auth policy, and `MapToApi(Constants.ApiName)`. All controllers inherit from it.
- `AIMediaJanitorApiComposer` registers services (all scoped), binds options, and configures a dedicated Swagger document (`Constants.ApiName = "aimediajanitor"`) with a custom `OperationIdHandler` so generated TS client methods get clean names. This swagger doc is the source for `npm run generate-client`.

### Frontend

Umbraco backoffice extension: Lit web components + TypeScript, built by Vite into a single ES bundle (`ai-media-janitor.js`). Registration chain:

- `wwwroot/App_Plugins/AIMediaJanitor/umbraco-package.json` declares one **bundle** extension pointing at the built JS.
- `Client/src/bundle.manifests.ts` is the vite entry; it collates feature manifests. Currently just `assistant/` → a **menuItem** (link in the Media sidebar) + a **dashboard** (the workspace), both gated to the Media section. Centralized aliases live in `assistant/constants.ts`.
- `assistant/workspace.element.ts` is the single UI element: candidate table, per-row and bulk "Analyse" (concurrency-limited to 2 to avoid provider rate limits), and "Apply".
- `Client/src/api/` is **generated** by hey-api from swagger — treat as generated, don't hand-edit. `Client/src/hey-api.ts` wires the generated client to reuse the backoffice's authenticated `umbHttpClient`. Note the workspace currently calls the endpoints manually (via `client.get/post` with explicit `security: [{scheme:"bearer",...}]`) rather than through the generated SDK methods.

Regenerating the client requires the TestSite running (the script fetches `https://localhost:44338/umbraco/swagger/aimediajanitor/swagger.json` and ignores the self-signed cert).

## Code style

Team C#/JS/CSS standards are enforced via the **`coding-standards` skill** — consult it when writing or reviewing code. Umbraco backoffice extension work has dedicated skills under `umbraco-cms-backoffice-skills:*` (workspaces, dashboards, menu items, the OpenAPI client, etc.).
