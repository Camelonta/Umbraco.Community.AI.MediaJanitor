# AI Media Janitor

[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.AI.MediaJanitor?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.AI.MediaJanitor/)
[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.AI.MediaJanitor?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.AI.MediaJanitor)
[![GitHub license](https://img.shields.io/github/license/gonziii/Umbraco.Community.AI.MediaJanitor?color=8AB803)](https://github.com/gonziii/Umbraco.Community.AI.MediaJanitor/blob/main/LICENSE)

An Umbraco (v17+) package that adds an **AI Media Assistant** to the Media section. It finds images with missing alt text, generic file names, or in the wrong folder, and uses a vision‑capable AI model (via [Umbraco.AI](https://marketplace.umbraco.com/package/umbraco.ai)) to suggest a better file name, alt text, caption, and folder. You review and edit each suggestion in a table, then apply the ones you want — nothing is changed automatically.

## Features

- Scans image media for **missing alt text** and **poor/generic names**.
- AI suggestions for **name, alt text, caption**, plus a confidence flag.
- **Grounded folder‑move suggestions**: move into a better **existing** folder or create a **new** one, tied to real folder keys.
- Review table with editable suggestion chips, per‑row bulk analyse, remove/restore, and an opt‑in folder move with an override picker.

## Requirements

- Umbraco CMS **17.0+** (.NET 10).
- [Umbraco.AI](https://marketplace.umbraco.com/package/umbraco.ai) plus a provider with a **vision‑capable** model (e.g. `Umbraco.AI.OpenAI`, `Umbraco.AI.Anthropic`, `Umbraco.AI.Google`).

## Quick start

```bash
dotnet add package Umbraco.Community.AI.MediaJanitor
dotnet add package Umbraco.AI
dotnet add package Umbraco.AI.OpenAI
```

1. In the backoffice **AI** section, create a **Connection** (with an API key + vision model) and a **Profile**; note the profile **alias**.
2. Point Media Janitor at that profile in `appsettings.json`:

   ```json
   {
     "Umbraco": {
       "CMS": {
         "AIMediaJanitor": {
           "ProfileAlias": "media-janitor",
           "ChatAlias": "media-janitor"
         }
       }
     }
   }
   ```

   `ProfileAlias` must match the Umbraco.AI **Profile alias** (leave empty for the default profile). `ChatAlias` is a telemetry/auditing label.
3. Open **Media → AI Media Assistant**, analyse images, review, and apply.

See the [full documentation on GitHub](https://github.com/gonziii/Umbraco.Community.AI.MediaJanitor) for all configuration options and details on how it works.
