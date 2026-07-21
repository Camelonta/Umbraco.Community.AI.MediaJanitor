import {
  LitElement,
  css,
  html,
  customElement,
  state,
  repeat,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
// Re-use the auth-aware HTTP client the generated SDK uses, so our as-yet-
// ungenerated endpoints still get a bearer token attached.
import { client } from "../api/client.gen.js";

// Controller inherits the base route from AIMediaJanitorApiControllerBase
// ([BackOfficeRoute("aimediajanitor/api/v{version:apiVersion}")]), so actions
// are mounted directly under that prefix.
const API_BASE = "/umbraco/aimediajanitor/api/v1";

// Same shape the generated SDK uses on every call — the umbHttpClient auth
// interceptor only attaches a bearer token when `security` is set on the
// request, so manual calls must pass it too.
const BEARER_AUTH = [{ scheme: "bearer", type: "http" }] as const;

interface MediaCandidate {
  key: string;
  name: string;
  currentAltText?: string | null;
  folderPath?: string | null;
  mediaTypeAlias?: string | null;
  missingAlt: boolean;
  poorName: boolean;
}

interface FolderSuggestion {
  targetFolderKey?: string | null;
  targetPath?: string | null;
  newFolderName?: string | null;
  reason?: string | null;
  isChange: boolean;
}

interface AnalysisSuggestion {
  mediaKey: string;
  name?: string | null;
  altText?: string | null;
  caption?: string | null;
  folder?: FolderSuggestion | null;
  uncertain: boolean;
  note?: string | null;
  currentFolderKey?: string | null;
  currentFolderPath?: string | null;
}

interface CandidatePage {
  items: MediaCandidate[];
  total: number;
}

interface MediaFolder {
  key: string;
  name: string;
  displayPath: string;
}

// Sentinel values for the per-row folder override dropdown.
const MOVE_NONE = "none";
const MOVE_NEW = "new";

const ANALYZE_CONCURRENCY = 2;

@customElement("ai-media-assistant-workspace")
export class AIMediaAssistantWorkspaceElement extends UmbElementMixin(LitElement) {
  @state() private _missingAlt = true;
  @state() private _poorName = true;
  @state() private _loading = false;
  @state() private _candidates: MediaCandidate[] = [];
  @state() private _folders: MediaFolder[] = [];
  @state() private _suggestions: Map<string, AnalysisSuggestion> = new Map();
  @state() private _busyKeys: Set<string> = new Set();
  // Per-row opt-in for the folder move, and the chosen target (folder key,
  // MOVE_NEW, or MOVE_NONE).
  @state() private _moveEnabled: Set<string> = new Set();
  @state() private _moveTarget: Map<string, string> = new Map();
  // Editor overrides of the AI's suggested text fields, keyed by media key.
  // Seeded from the suggestion on analyse; used on apply.
  @state() private _nameEdits: Map<string, string> = new Map();
  @state() private _altEdits: Map<string, string> = new Map();
  @state() private _captionEdits: Map<string, string> = new Map();
  @state() private _newFolderEdits: Map<string, string> = new Map();
  // Per-field UI state, keyed by "<field>:<mediaKey>". A dismissed field is not
  // applied; an editing field shows an input instead of the suggestion chip.
  @state() private _dismissed: Set<string> = new Set();
  @state() private _editing: Set<string> = new Set();
  @state() private _bulkRunning = false;
  @state() private _bulkProgress = 0;
  @state() private _bulkTotal = 0;
  @state() private _error?: string;

  #notifications?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;
  // Composite "<field>:<mediaKey>" whose edit input should grab focus next render.
  #pendingFocus: string | null = null;

  constructor() {
    super();
    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
      this.#notifications = ctx;
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.#loadCandidates();
    void this.#loadFolders();
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this.#pendingFocus) return;
    const selector = `uui-input[data-edit-key="${CSS.escape(this.#pendingFocus)}"]`;
    const input = this.shadowRoot?.querySelector<HTMLElement>(selector);
    input?.focus();
    this.#pendingFocus = null;
  }

  // -- data --------------------------------------------------------------

  async #loadFolders() {
    try {
      const { data } = await client.get<MediaFolder[]>({
        url: `${API_BASE}/folders`,
        security: BEARER_AUTH,
      });
      this._folders = data ?? [];
    } catch {
      // The override picker just falls back to "don't move / AI suggestion".
      this._folders = [];
    }
  }

  async #loadCandidates() {
    this._loading = true;
    this._error = undefined;
    try {
      const { data, error, response } = await client.get<CandidatePage>({
        url: `${API_BASE}/candidates`,
        security: BEARER_AUTH,
        query: {
          missingAlt: this._missingAlt,
          poorName: this._poorName,
          skip: 0,
          take: 50,
        },
      });
      if (error || !data) {
        throw new Error(`Failed to load candidates (${response.status})`);
      }
      this._candidates = data.items;
      // Drop suggestions for items that disappeared from the list.
      const keep = new Set(data.items.map((c) => c.key));
      const filtered = new Map<string, AnalysisSuggestion>();
      for (const [k, v] of this._suggestions) {
        if (keep.has(k)) filtered.set(k, v);
      }
      this._suggestions = filtered;
    } catch (e) {
      this._error = (e as Error).message;
    } finally {
      this._loading = false;
    }
  }

  async #analyzeOne(key: string): Promise<void> {
    const busy = new Set(this._busyKeys);
    busy.add(key);
    this._busyKeys = busy;
    try {
      const { data, error, response } = await client.post<AnalysisSuggestion>({
        url: `${API_BASE}/analyze`,
        security: BEARER_AUTH,
        body: { mediaKey: key },
      });
      if (error || !data) {
        throw new Error(`Analyze failed (${response.status})`);
      }
      const next = new Map(this._suggestions);
      next.set(key, data);
      this._suggestions = next;

      // Pre-select the AI's folder choice, but leave the move opt-in (toggle off).
      const target = new Map(this._moveTarget);
      target.set(key, this.#defaultMoveTarget(data));
      this._moveTarget = target;

      // Seed the editable fields from the fresh suggestion (a re-analyse resets
      // any earlier edits, dismissals, and edit modes).
      this._nameEdits = this.#seedEdit(this._nameEdits, key, data.name);
      this._altEdits = this.#seedEdit(this._altEdits, key, data.altText);
      this._captionEdits = this.#seedEdit(this._captionEdits, key, data.caption);
      this._newFolderEdits = this.#seedEdit(
        this._newFolderEdits,
        key,
        data.folder?.newFolderName,
      );
      this.#clearRowUiState(key);
    } catch (e) {
      this.#notifications?.peek("danger", {
        data: { headline: "Analyze failed", message: (e as Error).message },
      });
    } finally {
      const busy2 = new Set(this._busyKeys);
      busy2.delete(key);
      this._busyKeys = busy2;
    }
  }

  /**
   * Runs analysis over every loaded candidate. We bound concurrency because
   * a single tenant hammering its AI provider with 50 parallel image calls is
   * an easy way to hit rate limits and get 429s.
   */
  async #analyzeAll() {
    if (this._candidates.length === 0 || this._bulkRunning) return;

    this._bulkRunning = true;
    this._bulkProgress = 0;
    this._bulkTotal = this._candidates.length;

    const queue = [...this._candidates];
    const workers = Array.from({ length: ANALYZE_CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        await this.#analyzeOne(next.key);
        this._bulkProgress = this._bulkProgress + 1;
      }
    });

    try {
      await Promise.all(workers);
      this.#notifications?.peek("positive", {
        data: {
          headline: "Analysis complete",
          message: `Analysed ${this._bulkTotal} item${this._bulkTotal === 1 ? "" : "s"}.`,
        },
      });
    } finally {
      this._bulkRunning = false;
    }
  }

  async #applyOne(key: string) {
    const suggestion = this._suggestions.get(key);
    if (!suggestion) return;

    // Apply every non-dismissed suggested field. The editor reviews the table
    // first and can remove (X) any suggestion they don't want applied.
    const body: Record<string, unknown> = { mediaKey: key };
    const name = this.#effectiveValue("name", key, this._nameEdits, suggestion.name);
    if (name) body.name = name;
    const altText = this.#effectiveValue("alt", key, this._altEdits, suggestion.altText);
    if (altText) body.altText = altText;
    const caption = this.#effectiveValue("caption", key, this._captionEdits, suggestion.caption);
    if (caption) body.caption = caption;

    // Folder move is opt-in per row. The dropdown holds either an existing folder
    // key, MOVE_NEW (create the editor's / AI's new folder), or MOVE_NONE.
    if (this._moveEnabled.has(key)) {
      const target = this._moveTarget.get(key) ?? MOVE_NONE;
      if (target === MOVE_NEW) {
        const newName = (this._newFolderEdits.get(key) ?? suggestion.folder?.newFolderName ?? "").trim();
        if (newName) body.newFolderName = newName;
      } else if (target !== MOVE_NONE) {
        body.targetFolderKey = target;
      }
    }

    if (Object.keys(body).length === 1) {
      this.#notifications?.peek("warning", {
        data: { headline: "Nothing to apply", message: "The suggestion is empty for this item." },
      });
      return;
    }

    const busy = new Set(this._busyKeys);
    busy.add(key);
    this._busyKeys = busy;
    try {
      const { error, response } = await client.post({
        url: `${API_BASE}/apply`,
        security: BEARER_AUTH,
        body,
      });
      if (error) {
        throw new Error(`Apply failed (${response.status})`);
      }
      this.#notifications?.peek("positive", {
        data: {
          headline: "Applied",
          message: `Updated ${name || "media item"}`,
        },
      });

      this._candidates = this._candidates.filter((c) => c.key !== key);
      const sug = new Map(this._suggestions);
      sug.delete(key);
      this._suggestions = sug;
      const moveEnabled = new Set(this._moveEnabled);
      moveEnabled.delete(key);
      this._moveEnabled = moveEnabled;
      const moveTarget = new Map(this._moveTarget);
      moveTarget.delete(key);
      this._moveTarget = moveTarget;
      this._nameEdits = this.#clearEdit(this._nameEdits, key);
      this._altEdits = this.#clearEdit(this._altEdits, key);
      this._captionEdits = this.#clearEdit(this._captionEdits, key);
      this._newFolderEdits = this.#clearEdit(this._newFolderEdits, key);
      this.#clearRowUiState(key);
    } catch (e) {
      this.#notifications?.peek("danger", {
        data: { headline: "Apply failed", message: (e as Error).message },
      });
    } finally {
      const busy2 = new Set(this._busyKeys);
      busy2.delete(key);
      this._busyKeys = busy2;
    }
  }

  // -- folder move helpers ----------------------------------------------

  #defaultMoveTarget(s: AnalysisSuggestion): string {
    if (s.folder?.targetFolderKey) return s.folder.targetFolderKey;
    if (s.folder?.newFolderName) return MOVE_NEW;
    return MOVE_NONE;
  }

  #toggleMove(key: string, enabled: boolean) {
    const next = new Set(this._moveEnabled);
    if (enabled) next.add(key);
    else next.delete(key);
    this._moveEnabled = next;
  }

  #setMoveTarget(key: string, target: string) {
    const next = new Map(this._moveTarget);
    next.set(key, target);
    this._moveTarget = next;
  }

  // -- editable text helpers --------------------------------------------

  /** Returns a copy of the map with the key set (or removed when empty). */
  #seedEdit(
    edits: Map<string, string>,
    key: string,
    value: string | null | undefined,
  ): Map<string, string> {
    const next = new Map(edits);
    if (value) next.set(key, value);
    else next.delete(key);
    return next;
  }

  /** Returns a copy of the map with the key removed. */
  #clearEdit(edits: Map<string, string>, key: string): Map<string, string> {
    const next = new Map(edits);
    next.delete(key);
    return next;
  }

  // Composite key for the per-field dismiss/edit sets.
  #uiKey(field: string, key: string): string {
    return `${field}:${key}`;
  }

  #setEditing(field: string, key: string, editing: boolean) {
    const next = new Set(this._editing);
    if (editing) {
      next.add(this.#uiKey(field, key));
      // Focus the field once it renders (autofocus is unreliable in shadow DOM).
      this.#pendingFocus = this.#uiKey(field, key);
    } else {
      next.delete(this.#uiKey(field, key));
    }
    this._editing = next;
  }

  #setDismissed(field: string, key: string, dismissed: boolean) {
    const next = new Set(this._dismissed);
    if (dismissed) next.add(this.#uiKey(field, key));
    else next.delete(this.#uiKey(field, key));
    this._dismissed = next;
    // Leaving edit mode when a field is removed keeps the two states consistent.
    if (dismissed) this.#setEditing(field, key, false);
  }

  /** Clears every per-field UI flag for a row (on re-analyse / after apply). */
  #clearRowUiState(key: string) {
    const suffix = `:${key}`;
    this._dismissed = new Set([...this._dismissed].filter((k) => !k.endsWith(suffix)));
    this._editing = new Set([...this._editing].filter((k) => !k.endsWith(suffix)));
  }

  /** The value to apply for a field, or "" when dismissed / empty. */
  #effectiveValue(
    field: string,
    key: string,
    edits: Map<string, string>,
    suggested: string | null | undefined,
  ): string {
    if (this._dismissed.has(this.#uiKey(field, key))) return "";
    return (edits.get(key) ?? suggested ?? "").trim();
  }

  // -- render ------------------------------------------------------------

  render() {
    const analyzedCount = this._suggestions.size;
    const totalCount = this._candidates.length;

    return html`
      <umb-body-layout headline="AI Media Assistant">
        <uui-box headline="Find images to review" class="filters">
          <p class="muted">
            Click <b>Analyse all images</b> to run AI suggestions across every
            image listed below. Review the table, then apply per row.
          </p>

          <div class="filter-row">
            <uui-toggle
              label="Missing alt text"
              ?checked=${this._missingAlt}
              @change=${(e: Event) => {
        this._missingAlt = (e.target as HTMLInputElement).checked;
      }}
            ></uui-toggle>
            <uui-toggle
              label="Poor / generic name"
              ?checked=${this._poorName}
              @change=${(e: Event) => {
        this._poorName = (e.target as HTMLInputElement).checked;
      }}
            ></uui-toggle>
            <uui-button look="secondary" @click=${() => this.#loadCandidates()}>
              Refresh list
            </uui-button>
            <uui-button
              look="primary"
              color="positive"
              ?disabled=${this._bulkRunning || totalCount === 0}
              @click=${() => this.#analyzeAll()}
            >
              ${this._bulkRunning
        ? `Analysing ${this._bulkProgress} / ${this._bulkTotal}…`
        : `Analyse all images (${totalCount})`}
            </uui-button>
            <span class="muted small"
              >${analyzedCount} of ${totalCount} analysed</span
            >
          </div>

          ${this._bulkRunning
        ? html`<uui-loader-bar></uui-loader-bar>`
        : null}
          ${this._error ? html`<p class="error">${this._error}</p>` : null}
        </uui-box>

        ${this._loading
        ? html`<uui-loader></uui-loader>`
        : this._candidates.length === 0
          ? html`<uui-box
                ><p>No images need attention with the current filters.</p></uui-box
              >`
          : this.#renderTable()}
      </umb-body-layout>
    `;
  }

  #renderTable() {
    return html`
      <uui-box headline="Media files that need attention">
        <div class="table-scroll">
        <uui-table>
          <uui-table-head>
            <uui-table-head-cell>File</uui-table-head-cell>
            <uui-table-head-cell>Issues</uui-table-head-cell>
            <uui-table-head-cell>Current alt</uui-table-head-cell>
            <uui-table-head-cell>Suggested name</uui-table-head-cell>
            <uui-table-head-cell>Suggested alt</uui-table-head-cell>
            <uui-table-head-cell>Caption</uui-table-head-cell>
            <uui-table-head-cell>Folder</uui-table-head-cell>
            <uui-table-head-cell>Confidence</uui-table-head-cell>
            <uui-table-head-cell>Actions</uui-table-head-cell>
          </uui-table-head>
          ${repeat(this._candidates, (c) => c.key, (c) => this.#renderRow(c))}
        </uui-table>
        </div>
      </uui-box>
    `;
  }

  #renderRow(c: MediaCandidate) {
    const s = this._suggestions.get(c.key);
    const busy = this._busyKeys.has(c.key);

    return html`
      <uui-table-row class=${busy ? "row-busy" : ""}>
        <uui-table-cell>
          <div class="file-cell">
            <strong title=${c.name}>${c.name}</strong>
            <span class="muted small" title=${c.folderPath ?? "/"}
              >${c.folderPath ?? "/"}</span
            >
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="tags">
            ${c.missingAlt
        ? html`<uui-tag color="danger" look="primary" size="s">no alt</uui-tag>`
        : null}
            ${c.poorName
        ? html`<uui-tag color="warning" look="primary" size="s"
                  >generic name</uui-tag
                >`
        : null}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class=${c.currentAltText ? "" : "muted"}
            >${c.currentAltText ?? "—"}</span
          >
        </uui-table-cell>
        <uui-table-cell>
          ${this.#renderSuggestionChip(
          "name",
          c.key,
          this._nameEdits,
          s?.name,
          (m) => (this._nameEdits = m),
          "suggested name",
        )}
        </uui-table-cell>
        <uui-table-cell>
          ${this.#renderSuggestionChip(
          "alt",
          c.key,
          this._altEdits,
          s?.altText,
          (m) => (this._altEdits = m),
          "suggested alt text",
        )}
        </uui-table-cell>
        <uui-table-cell>
          ${this.#renderSuggestionChip(
          "caption",
          c.key,
          this._captionEdits,
          s?.caption,
          (m) => (this._captionEdits = m),
          "caption",
        )}
        </uui-table-cell>
        <uui-table-cell>
          ${this.#renderFolderCell(c, s)}
        </uui-table-cell>
        <uui-table-cell>
          ${s
        ? s.uncertain
          ? html`<uui-tag color="warning" size="s" title=${s.note ?? ""}
                  >uncertain</uui-tag
                >`
          : html`<uui-tag color="positive" size="s">ok</uui-tag>`
        : html`<span class="muted">—</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              size="s"
              look="secondary"
              ?disabled=${busy || this._bulkRunning}
              @click=${() => this.#analyzeOne(c.key)}
            >
              ${s ? "Re-analyse" : "Analyse"}
            </uui-button>
            <uui-button
              size="s"
              look="primary"
              color="positive"
              ?disabled=${busy || !s}
              @click=${() => this.#applyOne(c.key)}
            >
              Apply
            </uui-button>
            ${busy ? html`<uui-loader-circle></uui-loader-circle>` : null}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
  }

  /**
   * Renders a suggestion as a green chip with Edit and Remove (X) actions.
   * - No suggestion (and no edit) → a dash.
   * - Removed → a subtle "Removed" chip with a Restore action.
   * - Editing → an input plus a Done action.
   * - Otherwise → the green chip showing the current value.
   * Edits are held in <paramref name="edits"/>, reassigned via <paramref name="assign"/>.
   */
  #renderSuggestionChip(
    field: string,
    key: string,
    edits: Map<string, string>,
    suggested: string | null | undefined,
    assign: (next: Map<string, string>) => void,
    label: string,
  ) {
    const value = edits.get(key) ?? suggested ?? "";
    if (!value && !this._editing.has(this.#uiKey(field, key))) {
      return html`<span class="muted">—</span>`;
    }

    if (this._dismissed.has(this.#uiKey(field, key))) {
      return html`
        <span class="suggestion-chip suggestion-chip--removed">
          <span class="suggestion-chip__text">Removed</span>
          <uui-button
            class="suggestion-chip__btn suggestion-chip__btn--muted"
            compact
            label="Restore ${label}"
            @click=${() => this.#setDismissed(field, key, false)}
          >
            <umb-icon name="icon-undo"></umb-icon>
          </uui-button>
        </span>
      `;
    }

    if (this._editing.has(this.#uiKey(field, key))) {
      return html`
        <span class="suggestion-edit">
          <uui-input
            class="cell-input"
            label=${label}
            data-edit-key=${this.#uiKey(field, key)}
            .value=${value}
            @input=${(e: Event) => {
          const next = new Map(edits);
          next.set(key, (e.target as HTMLInputElement).value);
          assign(next);
        }}
            @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter") this.#setEditing(field, key, false);
        }}
          ></uui-input>
          <uui-button
            look="primary"
            color="positive"
            compact
            label="Done editing ${label}"
            @click=${() => this.#setEditing(field, key, false)}
          >
            <umb-icon name="icon-check"></umb-icon>
          </uui-button>
        </span>
      `;
    }

    return html`
      <span class="suggestion-chip">
        <span class="suggestion-chip__text" title=${value}>${value}</span>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Edit ${label}"
          @click=${() => this.#setEditing(field, key, true)}
        >
          <umb-icon name="icon-edit"></umb-icon>
        </uui-button>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Remove ${label}"
          @click=${() => this.#setDismissed(field, key, true)}
        >
          <umb-icon name="icon-wrong"></umb-icon>
        </uui-button>
      </span>
    `;
  }

  #renderFolderCell(c: MediaCandidate, s?: AnalysisSuggestion) {
    const currentPath = s?.currentFolderPath ?? c.folderPath ?? "/";

    // Before analysis, or when the AI sees no better home, just show where it is.
    if (!s || !s.folder?.isChange) {
      return html`
        <div class="folder-cell">
          <span class="muted small">${currentPath}</span>
          ${s ? html`<span class="muted small">no move suggested</span>` : null}
        </div>
      `;
    }

    const folder = s.folder;
    const newFolderName = this._newFolderEdits.get(c.key) ?? folder.newFolderName;
    const suggestedLabel = folder.newFolderName
      ? `＋ new: ${newFolderName}`
      : folder.targetPath ?? "";
    const enabled = this._moveEnabled.has(c.key);
    const selected = this._moveTarget.get(c.key) ?? this.#defaultMoveTarget(s);

    return html`
      <div class="folder-cell">
        <span class="muted small">${currentPath}</span>
        <span class="folder-arrow">
          →
          <span class="suggestion-chip" title=${folder.reason ?? ""}>
            <span class="suggestion-chip__text">${suggestedLabel}</span>
          </span>
        </span>
        <uui-toggle
          label="Move"
          ?checked=${enabled}
          @change=${(e: Event) =>
        this.#toggleMove(c.key, (e.target as HTMLInputElement).checked)}
        ></uui-toggle>
        ${enabled ? this.#renderFolderPicker(c.key, folder, selected) : null}
        ${enabled && selected === MOVE_NEW
        ? html`<uui-input
              class="cell-input"
              label="New folder name"
              .value=${newFolderName ?? ""}
              @input=${(e: Event) => {
            const next = new Map(this._newFolderEdits);
            next.set(c.key, (e.target as HTMLInputElement).value);
            this._newFolderEdits = next;
          }}
            ></uui-input>`
        : null}
      </div>
    `;
  }

  #renderFolderPicker(key: string, folder: FolderSuggestion, selected: string) {
    return html`
      <select
        class="folder-picker"
        @change=${(e: Event) =>
        this.#setMoveTarget(key, (e.target as HTMLSelectElement).value)}
      >
        <option value=${MOVE_NONE} ?selected=${selected === MOVE_NONE}>
          Don't move
        </option>
        ${folder.newFolderName
        ? html`<option value=${MOVE_NEW} ?selected=${selected === MOVE_NEW}>
              Create new folder…
            </option>`
        : null}
        ${this._folders.map(
          (f) => html`
            <option value=${f.key} ?selected=${selected === f.key}>
              ${f.displayPath}
            </option>
          `,
        )}
      </select>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
      }

      .filters {
        margin-bottom: var(--uui-size-layout-1);
      }
      .filter-row {
        display: flex;
        gap: var(--uui-size-space-3);
        align-items: center;
        flex-wrap: wrap;
      }

      .table-scroll {
        overflow-x: auto;
        max-width: 100%;
      }
      .file-cell {
        display: grid;
        gap: 2px;
      }
      .folder-cell {
        display: grid;
        gap: 4px;
        min-width: 180px;
      }
      .folder-arrow {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }
      .folder-picker {
        max-width: 220px;
        padding: 4px;
        border: 1px solid var(--uui-color-border);
        border-radius: 4px;
        background: var(--uui-color-surface);
        color: var(--uui-color-text);
        font-size: 0.85em;
      }
      .cell-input {
        width: 100%;
        min-width: 160px;
      }

      /* Toast-like suggestion chip: green, rounded, white text. */
      .suggestion-chip {
        display: inline-flex;
        align-items: flex-start;
        gap: 2px;
        max-width: 100%;
        padding: 3px 4px 3px 10px;
        border-radius: 12px;
        background: var(--uui-color-positive);
        color: var(--uui-color-positive-contrast);
        font-size: 0.85em;
        line-height: 1.4;
      }
      .suggestion-chip__text {
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
        max-width: 220px;
        padding-top: 3px;
      }
      .suggestion-chip__btn {
        --uui-button-contrast: var(--uui-color-positive-contrast);
        --uui-button-contrast-hover: var(--uui-color-positive-contrast);
        --uui-button-background-color: transparent;
        --uui-button-background-color-hover: rgba(255, 255, 255, 0.25);
        font-size: 0.9em;
      }
      .suggestion-chip--removed {
        background: var(--uui-color-disabled);
        color: var(--uui-color-disabled-contrast);
      }
      .suggestion-chip__btn--muted {
        --uui-button-contrast: var(--uui-color-disabled-contrast);
        --uui-button-contrast-hover: var(--uui-color-disabled-contrast);
        --uui-button-background-color-hover: rgba(0, 0, 0, 0.1);
      }
      .suggestion-edit {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .tags {
        display: flex;
        gap: var(--uui-size-space-1);
        flex-wrap: wrap;
      }
      .actions {
        display: flex;
        gap: var(--uui-size-space-2);
        align-items: center;
      }

      .row-busy {
        opacity: 0.6;
      }

      .muted {
        color: var(--uui-color-text-alt);
      }
      .small {
        font-size: 12px;
      }
      .error {
        color: var(--uui-color-danger);
      }
    `,
  ];
}

export default AIMediaAssistantWorkspaceElement;

declare global {
  interface HTMLElementTagNameMap {
    "ai-media-assistant-workspace": AIMediaAssistantWorkspaceElement;
  }
}
