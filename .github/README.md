# AI Media Janitor

[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.AI.MediaJanitor?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.AI.MediaJanitor/)
[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.AI.MediaJanitor?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.AI.MediaJanitor)
[![GitHub license](https://img.shields.io/github/license/Camelonta/Umbraco.Community.AI.MediaJanitor?color=8AB803)](../LICENSE)

**AI Media Janitor** is an Umbraco (v17+) package that adds an **AI Media Assistant** to the Media section. It finds images that need attention — missing alt text, generic file names, or sitting in the wrong folder — and uses a vision‑capable AI model (through [Umbraco.AI](https://marketplace.umbraco.com/package/umbraco.ai)) to suggest better metadata. You review every suggestion in a table and apply the ones you want.

It never calls a model on its own or changes anything silently: analysis and apply are separate, explicit steps, and you stay in control of each field.

---

## Features

- **Candidate scanning** – lists image media with **missing alt text** and/or a **poor/generic name** (e.g. `IMG_1234`, `DSC_0001`, `screenshot…`, or names that are too short or mostly digits). Both filters are toggleable.
- **AI suggestions per image**:
  - **File name** – clean, kebab‑case.
  - **Alt text** – short, factual, screen‑reader friendly.
  - **Caption** – optional one‑sentence caption.
  - **Confidence** – an `uncertain` flag with a short note when the model isn't sure.
- **Grounded folder move suggestions** – the assistant reads your **real media folder tree** and suggests moving the image into a better‑fitting **existing** folder, or proposes **creating a new** folder when nothing fits. Suggestions are tied to real folder keys, not invented paths.
- **Review UI**:
  - Analyse a single row or **bulk‑analyse** every candidate (concurrency‑bounded to avoid provider rate limits).
  - Every suggestion is an **editable green chip** with **Edit** and **✕ (remove)** actions — remove a suggestion and it won't be applied; restore it if you change your mind.
  - **Opt‑in folder move** per row, with a **picker** to override the AI's target folder or create a new one.
- **Safe apply** – writes back only what you kept: renames the item, sets alt/caption on the matching property, and moves (or creates‑then‑moves) the folder. Moves are validated (target must be a folder, never the item itself or one of its descendants).
- **Multilingual** – suggestions are produced in a configurable language (BCP‑47), defaulting to English.
- **Built‑in safety policy** – a fixed system prompt instructs the model to never identify private individuals, never infer sensitive attributes, never produce misleading alt text, and never overwrite good editor‑written metadata unless it's a clear improvement.

---

## Requirements

- Umbraco CMS **17.0+** (targets .NET 10).
- [Umbraco.AI](https://marketplace.umbraco.com/package/umbraco.ai) plus **one AI provider** package that exposes a **vision‑capable** chat model — for example `Umbraco.AI.OpenAI`, `Umbraco.AI.Anthropic`, or `Umbraco.AI.Google`. (Images are sent to the model, so a text‑only model won't work.)

---

## Installation

1. Add the package to your Umbraco website:

   ```bash
   dotnet add package Umbraco.Community.AI.MediaJanitor
   ```

2. Add Umbraco.AI and a provider (if you don't already have them), e.g.:

   ```bash
   dotnet add package Umbraco.AI
   dotnet add package Umbraco.AI.OpenAI
   ```

3. Build and run. A new **AI Media Assistant** entry appears in the **Media** section sidebar.

The package ships its backoffice UI pre‑built — there's nothing to compile on the client side to use it.

---

## Configuring the AI connection & profile

Media Janitor doesn't talk to OpenAI/Anthropic/etc. directly. It asks **Umbraco.AI** for a chat client, so you configure the model **once** in Umbraco.AI and point Media Janitor at it by **alias**.

### 1. Create a Connection and Profile in the backoffice

1. Go to the **AI** section → **Connections** and add a connection for your provider (e.g. OpenAI), supplying the API key and selecting a **vision‑capable** model.
2. Go to **Profiles** and create a profile that uses that connection. **Note the profile's alias** — for example `media-janitor`.

### 2. Point Media Janitor at that profile (appsettings)

Set the profile alias in `appsettings.json` so analysis is routed through it. The config section is **`Umbraco:CMS:AIMediaJanitor`**:

```jsonc
{
  "Umbraco": {
    "CMS": {
      "AIMediaJanitor": {
        // Must EXACTLY match the alias of a Profile you created in Umbraco AI.
        // Leave empty/omit to use Umbraco.AI's default profile.
        "ProfileAlias": "media-janitor",

        // A stable label passed to Umbraco.AI for telemetry / auditing.
        // Required by Umbraco.AI; any consistent string is fine.
        "ChatAlias": "media-janitor"
      }
    }
  }
}
```

> **The key part:** `ProfileAlias` is the link between this package and Umbraco.AI. The string you put here must be the **same alias** as the Umbraco.AI **Profile** you want to use. If it's blank, the default profile is used; if it points at a profile that doesn't exist, analysis fails with a message telling you to fix the alias or create the connection.

`ChatAlias` is not a routing key — it's just the label Umbraco.AI records for each call (handy for auditing/telemetry). Using the same value for both is perfectly fine.

### All configuration options

Every key lives under `Umbraco:CMS:AIMediaJanitor`:

| Setting              | Type       | Default          | Description |
|----------------------|------------|------------------|-------------|
| `ProfileAlias`       | `string?`  | *(null)*         | Umbraco.AI **Profile alias** to route analysis through. Empty = default profile. |
| `ChatAlias`          | `string`   | `media-janitor`  | Telemetry/auditing label passed to Umbraco.AI. |
| `DefaultLanguage`    | `string`   | `en`             | BCP‑47 language for suggestions when the request/​image gives no clear signal. |
| `MaxImageBytes`      | `int`      | `8388608` (8 MB) | Images larger than this are rejected before being sent to the model (keeps cost predictable). |
| `PoorNamePrefixes`   | `string[]` | `img_`, `image`, `dsc`, `dsc_`, `screenshot`, `untitled`, `photo`, `pasted`, `scan` | Case‑insensitive name prefixes treated as "generic". |
| `MaxPageSize`        | `int`      | `50`             | Max candidates returned per page from the candidates endpoint. |
| `SuggestFolderMove`  | `bool`     | `true`           | When `false`, folder‑move suggestions are skipped entirely. |
| `MaxFoldersInPrompt` | `int`      | `200`            | Caps how many folders are listed in the analysis prompt (token‑cost guard on very large trees). |

---

## How it works

### The flow

```
Media section → "AI Media Assistant" dashboard
        │
        ▼
  GET  candidates ──► scan the media library for images missing alt / with poor names
        │
        ▼
  POST analyze ─────► for each image: read the file + the real folder tree,
        │             ask the AI model (via Umbraco.AI) for name/alt/caption/folder,
        │             return a grounded suggestion (no changes made yet)
        ▼
  Review & edit ────► keep, edit, or remove each suggestion; opt in to the folder move
        │
        ▼
  POST apply ───────► rename, set alt/caption, and move/create‑then‑move — only the
                      fields you kept
```

- **Backend** (C#): a small set of scoped services behind a versioned backoffice API at `/umbraco/aimediajanitor/api/v1` (`candidates`, `folders`, `analyze`, `apply`), protected by the **Media section** access policy.
  - `MediaCandidateService` pages the media tree and flags images by the missing‑alt / poor‑name rules.
  - `MediaFolderService` flattens the folder tree (with display paths) for grounding and the override picker.
  - `MediaAnalysisService` obtains a chat client from Umbraco.AI (`IAIChatService`), sends the image plus a compact JSON schema and a **numbered list of your real folders**, and maps the model's chosen **folder index** back to a real folder key. It never mutates content.
  - `MediaSuggestionApplyService` writes accepted fields back to the `IMedia` and performs the move/create.
- **Frontend**: a Lit + TypeScript backoffice extension (a menu item + dashboard/workspace) that renders the review table and calls the API.

### Grounding & robustness

- Folders are presented to the model **by index**, not by GUID or free text — the server owns the index→folder mapping, so a suggestion can't drift to a folder that doesn't exist. Out‑of‑range or "already in the best folder" results simply produce no move.
- The apply step re‑validates the target against the live tree, so a folder deleted or moved between *analyse* and *apply* results in a friendly error rather than a broken move — and your other fields still apply.

### Property mapping

When applying, the package writes to the **first matching property** it finds on the media item:

- **Alt text**: `altText`, `alternativeText`, `alt`, or `altTekst`.
- **Caption**: `caption` or `imageCaption`.

If your media type uses different aliases, add one of the above (or adjust your media type) so suggestions have somewhere to land.

Supported image types for analysis: **JPEG, PNG, WebP, GIF**.

---

## Usage

1. Open **Media → AI Media Assistant**.
2. Choose the filters (**Missing alt text**, **Poor / generic name**) and click **Refresh list**.
3. Click **Analyse** on a row, or **Analyse all images** to process the whole list.
4. Review the suggestions:
   - Edit any chip with the ✎ button; remove one with ✕ so it won't be applied (↺ to restore).
   - To move the file, flip the **Move** toggle and, if you like, pick a different target folder (or *Create new folder…*) from the dropdown.
5. Click **Apply** on the row. The item is renamed, its alt/caption are set, and it's moved — using only the fields you kept.

---

## Contributing

Contributions are welcome — please read the [Contributing Guidelines](CONTRIBUTING.md). The solution includes a **test site** (`AI.MediaJanitor.TestSite`) configured for an unattended install to make local development easy; see its `appsettings.json` for login details and the sample `AIMediaJanitor` configuration.

## License

Licensed under the [MIT License](../LICENSE).
