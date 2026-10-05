import { LitElement as Oe, html as p, repeat as je, css as Pe, state as m, customElement as Me } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as Fe } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as Ie } from "@umbraco-cms/backoffice/notification";
import { umbHttpClient as Re } from "@umbraco-cms/backoffice/http-client";
const qe = {
  bodySerializer: (e) => JSON.stringify(
    e,
    (t, s) => typeof s == "bigint" ? s.toString() : s
  )
}, We = ({
  onRequest: e,
  onSseError: t,
  onSseEvent: s,
  responseTransformer: i,
  responseValidator: a,
  sseDefaultRetryDelay: o,
  sseMaxRetryAttempts: r,
  sseMaxRetryDelay: n,
  sseSleepFn: l,
  url: h,
  ...u
}) => {
  let _;
  const T = l ?? ((g) => new Promise((w) => setTimeout(w, g)));
  return { stream: async function* () {
    let g = o ?? 3e3, w = 0;
    const z = u.signal ?? new AbortController().signal;
    for (; !z.aborted; ) {
      w++;
      const P = u.headers instanceof Headers ? u.headers : new Headers(u.headers);
      _ !== void 0 && P.set("Last-Event-ID", _);
      try {
        const C = {
          redirect: "follow",
          ...u,
          body: u.serializedBody,
          headers: P,
          signal: z
        };
        let E = new Request(h, C);
        e && (E = await e(h, C));
        const v = await (u.fetch ?? globalThis.fetch)(E);
        if (!v.ok)
          throw new Error(
            `SSE failed: ${v.status} ${v.statusText}`
          );
        if (!v.body) throw new Error("No body in SSE response");
        const k = v.body.pipeThrough(new TextDecoderStream()).getReader();
        let J = "";
        const ae = () => {
          try {
            k.cancel();
          } catch {
          }
        };
        z.addEventListener("abort", ae);
        try {
          for (; ; ) {
            const { done: Te, value: ze } = await k.read();
            if (Te) break;
            J += ze;
            const ne = J.split(`

`);
            J = ne.pop() ?? "";
            for (const Ce of ne) {
              const Ne = Ce.split(`
`), K = [];
              let re;
              for (const $ of Ne)
                if ($.startsWith("data:"))
                  K.push($.replace(/^data:\s*/, ""));
                else if ($.startsWith("event:"))
                  re = $.replace(/^event:\s*/, "");
                else if ($.startsWith("id:"))
                  _ = $.replace(/^id:\s*/, "");
                else if ($.startsWith("retry:")) {
                  const le = Number.parseInt(
                    $.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(le) || (g = le);
                }
              let N, oe = !1;
              if (K.length) {
                const $ = K.join(`
`);
                try {
                  N = JSON.parse($), oe = !0;
                } catch {
                  N = $;
                }
              }
              oe && (a && await a(N), i && (N = await i(N))), s?.({
                data: N,
                event: re,
                id: _,
                retry: g
              }), K.length && (yield N);
            }
          }
        } finally {
          z.removeEventListener("abort", ae), k.releaseLock();
        }
        break;
      } catch (C) {
        if (t?.(C), r !== void 0 && w >= r)
          break;
        const E = Math.min(
          g * 2 ** (w - 1),
          n ?? 3e4
        );
        await T(E);
      }
    }
  }() };
}, Be = (e) => {
  switch (e) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, De = (e) => {
  switch (e) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
}, Ue = (e) => {
  switch (e) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, de = ({
  allowReserved: e,
  explode: t,
  name: s,
  style: i,
  value: a
}) => {
  if (!t) {
    const n = (e ? a : a.map((l) => encodeURIComponent(l))).join(De(i));
    switch (i) {
      case "label":
        return `.${n}`;
      case "matrix":
        return `;${s}=${n}`;
      case "simple":
        return n;
      default:
        return `${s}=${n}`;
    }
  }
  const o = Be(i), r = a.map((n) => i === "label" || i === "simple" ? e ? n : encodeURIComponent(n) : V({
    allowReserved: e,
    name: s,
    value: n
  })).join(o);
  return i === "label" || i === "matrix" ? o + r : r;
}, V = ({
  allowReserved: e,
  name: t,
  value: s
}) => {
  if (s == null)
    return "";
  if (typeof s == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${t}=${e ? s : encodeURIComponent(s)}`;
}, he = ({
  allowReserved: e,
  explode: t,
  name: s,
  style: i,
  value: a,
  valueOnly: o
}) => {
  if (a instanceof Date)
    return o ? a.toISOString() : `${s}=${a.toISOString()}`;
  if (i !== "deepObject" && !t) {
    let l = [];
    Object.entries(a).forEach(([u, _]) => {
      l = [
        ...l,
        u,
        e ? _ : encodeURIComponent(_)
      ];
    });
    const h = l.join(",");
    switch (i) {
      case "form":
        return `${s}=${h}`;
      case "label":
        return `.${h}`;
      case "matrix":
        return `;${s}=${h}`;
      default:
        return h;
    }
  }
  const r = Ue(i), n = Object.entries(a).map(
    ([l, h]) => V({
      allowReserved: e,
      name: i === "deepObject" ? `${s}[${l}]` : l,
      value: h
    })
  ).join(r);
  return i === "label" || i === "matrix" ? r + n : n;
}, Ke = /\{[^{}]+\}/g, He = ({ path: e, url: t }) => {
  let s = t;
  const i = t.match(Ke);
  if (i)
    for (const a of i) {
      let o = !1, r = a.substring(1, a.length - 1), n = "simple";
      r.endsWith("*") && (o = !0, r = r.substring(0, r.length - 1)), r.startsWith(".") ? (r = r.substring(1), n = "label") : r.startsWith(";") && (r = r.substring(1), n = "matrix");
      const l = e[r];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        s = s.replace(
          a,
          de({ explode: o, name: r, style: n, value: l })
        );
        continue;
      }
      if (typeof l == "object") {
        s = s.replace(
          a,
          he({
            explode: o,
            name: r,
            style: n,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (n === "matrix") {
        s = s.replace(
          a,
          `;${V({
            name: r,
            value: l
          })}`
        );
        continue;
      }
      const h = encodeURIComponent(
        n === "label" ? `.${l}` : l
      );
      s = s.replace(a, h);
    }
  return s;
}, Le = ({
  baseUrl: e,
  path: t,
  query: s,
  querySerializer: i,
  url: a
}) => {
  const o = a.startsWith("/") ? a : `/${a}`;
  let r = (e ?? "") + o;
  t && (r = He({ path: t, url: r }));
  let n = s ? i(s) : "";
  return n.startsWith("?") && (n = n.substring(1)), n && (r += `?${n}`), r;
};
function Ve(e) {
  const t = e.body !== void 0;
  if (t && e.bodySerializer)
    return "serializedBody" in e ? e.serializedBody !== void 0 && e.serializedBody !== "" ? e.serializedBody : null : e.body !== "" ? e.body : null;
  if (t)
    return e.body;
}
const Je = async (e, t) => {
  const s = typeof t == "function" ? await t(e) : t;
  if (s)
    return e.scheme === "bearer" ? `Bearer ${s}` : e.scheme === "basic" ? `Basic ${btoa(s)}` : s;
}, pe = ({
  allowReserved: e,
  array: t,
  object: s
} = {}) => (a) => {
  const o = [];
  if (a && typeof a == "object")
    for (const r in a) {
      const n = a[r];
      if (n != null)
        if (Array.isArray(n)) {
          const l = de({
            allowReserved: e,
            explode: !0,
            name: r,
            style: "form",
            value: n,
            ...t
          });
          l && o.push(l);
        } else if (typeof n == "object") {
          const l = he({
            allowReserved: e,
            explode: !0,
            name: r,
            style: "deepObject",
            value: n,
            ...s
          });
          l && o.push(l);
        } else {
          const l = V({
            allowReserved: e,
            name: r,
            value: n
          });
          l && o.push(l);
        }
    }
  return o.join("&");
}, Ge = (e) => {
  if (!e)
    return "stream";
  const t = e.split(";")[0]?.trim();
  if (t) {
    if (t.startsWith("application/json") || t.endsWith("+json"))
      return "json";
    if (t === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some(
      (s) => t.startsWith(s)
    ))
      return "blob";
    if (t.startsWith("text/"))
      return "text";
  }
}, Qe = (e, t) => t ? !!(e.headers.has(t) || e.query?.[t] || e.headers.get("Cookie")?.includes(`${t}=`)) : !1, Ye = async ({
  security: e,
  ...t
}) => {
  for (const s of e) {
    if (Qe(t, s.name))
      continue;
    const i = await Je(s, t.auth);
    if (!i)
      continue;
    const a = s.name ?? "Authorization";
    switch (s.in) {
      case "query":
        t.query || (t.query = {}), t.query[a] = i;
        break;
      case "cookie":
        t.headers.append("Cookie", `${a}=${i}`);
        break;
      default:
        t.headers.set(a, i);
        break;
    }
  }
}, ue = (e) => Le({
  baseUrl: e.baseUrl,
  path: e.path,
  query: e.query,
  querySerializer: typeof e.querySerializer == "function" ? e.querySerializer : pe(e.querySerializer),
  url: e.url
}), ce = (e, t) => {
  const s = { ...e, ...t };
  return s.baseUrl?.endsWith("/") && (s.baseUrl = s.baseUrl.substring(0, s.baseUrl.length - 1)), s.headers = fe(e.headers, t.headers), s;
}, Xe = (e) => {
  const t = [];
  return e.forEach((s, i) => {
    t.push([i, s]);
  }), t;
}, fe = (...e) => {
  const t = new Headers();
  for (const s of e) {
    if (!s)
      continue;
    const i = s instanceof Headers ? Xe(s) : Object.entries(s);
    for (const [a, o] of i)
      if (o === null)
        t.delete(a);
      else if (Array.isArray(o))
        for (const r of o)
          t.append(a, r);
      else o !== void 0 && t.set(
        a,
        typeof o == "object" ? JSON.stringify(o) : o
      );
  }
  return t;
};
class G {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(t) {
    const s = this.getInterceptorIndex(t);
    this.fns[s] && (this.fns[s] = null);
  }
  exists(t) {
    const s = this.getInterceptorIndex(t);
    return !!this.fns[s];
  }
  getInterceptorIndex(t) {
    return typeof t == "number" ? this.fns[t] ? t : -1 : this.fns.indexOf(t);
  }
  update(t, s) {
    const i = this.getInterceptorIndex(t);
    return this.fns[i] ? (this.fns[i] = s, t) : !1;
  }
  use(t) {
    return this.fns.push(t), this.fns.length - 1;
  }
}
const Ze = () => ({
  error: new G(),
  request: new G(),
  response: new G()
}), et = pe({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), tt = {
  "Content-Type": "application/json"
}, ge = (e = {}) => ({
  ...qe,
  headers: tt,
  parseAs: "auto",
  querySerializer: et,
  ...e
}), st = (e = {}) => {
  let t = ce(ge(), e);
  const s = () => ({ ...t }), i = (h) => (t = ce(t, h), s()), a = Ze(), o = async (h) => {
    const u = {
      ...t,
      ...h,
      fetch: h.fetch ?? t.fetch ?? globalThis.fetch,
      headers: fe(t.headers, h.headers),
      serializedBody: void 0
    };
    u.security && await Ye({
      ...u,
      security: u.security
    }), u.requestValidator && await u.requestValidator(u), u.body !== void 0 && u.bodySerializer && (u.serializedBody = u.bodySerializer(u.body)), (u.body === void 0 || u.serializedBody === "") && u.headers.delete("Content-Type");
    const _ = ue(u);
    return { opts: u, url: _ };
  }, r = async (h) => {
    const { opts: u, url: _ } = await o(h), T = {
      redirect: "follow",
      ...u,
      body: Ve(u)
    };
    let S = new Request(_, T);
    for (const y of a.request.fns)
      y && (S = await y(S, u));
    const U = u.fetch;
    let g = await U(S);
    for (const y of a.response.fns)
      y && (g = await y(g, S, u));
    const w = {
      request: S,
      response: g
    };
    if (g.ok) {
      const y = (u.parseAs === "auto" ? Ge(g.headers.get("Content-Type")) : u.parseAs) ?? "json";
      if (g.status === 204 || g.headers.get("Content-Length") === "0") {
        let k;
        switch (y) {
          case "arrayBuffer":
          case "blob":
          case "text":
            k = await g[y]();
            break;
          case "formData":
            k = new FormData();
            break;
          case "stream":
            k = g.body;
            break;
          default:
            k = {};
            break;
        }
        return u.responseStyle === "data" ? k : {
          data: k,
          ...w
        };
      }
      let v;
      switch (y) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          v = await g[y]();
          break;
        case "stream":
          return u.responseStyle === "data" ? g.body : {
            data: g.body,
            ...w
          };
      }
      return y === "json" && (u.responseValidator && await u.responseValidator(v), u.responseTransformer && (v = await u.responseTransformer(v))), u.responseStyle === "data" ? v : {
        data: v,
        ...w
      };
    }
    const z = await g.text();
    let P;
    try {
      P = JSON.parse(z);
    } catch {
    }
    const C = P ?? z;
    let E = C;
    for (const y of a.error.fns)
      y && (E = await y(C, g, S, u));
    if (E = E || {}, u.throwOnError)
      throw E;
    return u.responseStyle === "data" ? void 0 : {
      error: E,
      ...w
    };
  }, n = (h) => (u) => r({ ...u, method: h }), l = (h) => async (u) => {
    const { opts: _, url: T } = await o(u);
    return We({
      ..._,
      body: _.body,
      headers: _.headers,
      method: h,
      onRequest: async (S, U) => {
        let g = new Request(S, U);
        for (const w of a.request.fns)
          w && (g = await w(g, _));
        return g;
      },
      url: T
    });
  };
  return {
    buildUrl: ue,
    connect: n("CONNECT"),
    delete: n("DELETE"),
    get: n("GET"),
    getConfig: s,
    head: n("HEAD"),
    interceptors: a,
    options: n("OPTIONS"),
    patch: n("PATCH"),
    post: n("POST"),
    put: n("PUT"),
    request: r,
    setConfig: i,
    sse: {
      connect: l("CONNECT"),
      delete: l("DELETE"),
      get: l("GET"),
      head: l("HEAD"),
      options: l("OPTIONS"),
      patch: l("PATCH"),
      post: l("POST"),
      put: l("PUT"),
      trace: l("TRACE")
    },
    trace: n("TRACE")
  };
}, it = (e) => ({
  ...e,
  // The backoffice client's types come from a different hey-api version, so the shapes differ slightly.
  ...Re.getConfig()
}), W = st(it(ge({
  baseUrl: "https://localhost:44338"
})));
var at = Object.defineProperty, nt = Object.getOwnPropertyDescriptor, be = (e) => {
  throw TypeError(e);
}, b = (e, t, s, i) => {
  for (var a = i > 1 ? void 0 : i ? nt(t, s) : t, o = e.length - 1, r; o >= 0; o--)
    (r = e[o]) && (a = (i ? r(t, s, a) : r(a)) || a);
  return i && a && at(t, s, a), a;
}, ee = (e, t, s) => t.has(e) || be("Cannot " + s), O = (e, t, s) => (ee(e, t, "read from private field"), t.get(e)), Q = (e, t, s) => t.has(e) ? be("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), Y = (e, t, s, i) => (ee(e, t, "write to private field"), t.set(e, s), s), d = (e, t, s) => (ee(e, t, "access private method"), s), A, j, c, me, _e, X, te, ye, we, se, ve, $e, M, F, x, I, Z, ie, H, xe, Ee, L, ke, Se;
const B = "/umbraco/aimediajanitor/api/v1", D = [{ scheme: "bearer", type: "http" }], R = "none", q = "new", rt = 2;
function Ae(e, t) {
  if (e && typeof e == "object" && "error" in e) {
    const s = e.error;
    if (typeof s == "string" && s.length > 0) return s;
  }
  return t;
}
let f = class extends Fe(Oe) {
  constructor() {
    super(), Q(this, c), this._missingAlt = !0, this._poorName = !0, this._loading = !1, this._candidates = [], this._folders = [], this._languages = [], this._language = "", this._suggestions = /* @__PURE__ */ new Map(), this._busyKeys = /* @__PURE__ */ new Set(), this._moveEnabled = /* @__PURE__ */ new Set(), this._moveTarget = /* @__PURE__ */ new Map(), this._nameEdits = /* @__PURE__ */ new Map(), this._altEdits = /* @__PURE__ */ new Map(), this._captionEdits = /* @__PURE__ */ new Map(), this._newFolderEdits = /* @__PURE__ */ new Map(), this._dismissed = /* @__PURE__ */ new Set(), this._editing = /* @__PURE__ */ new Set(), this._bulkRunning = !1, this._bulkProgress = 0, this._bulkTotal = 0, Q(this, A), Q(this, j, null), this.consumeContext(Ie, (e) => {
      Y(this, A, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, c, X).call(this), d(this, c, me).call(this), d(this, c, _e).call(this);
  }
  updated(e) {
    if (super.updated(e), !O(this, j)) return;
    const t = `uui-input[data-edit-key="${CSS.escape(O(this, j))}"]`;
    this.shadowRoot?.querySelector(t)?.focus(), Y(this, j, null);
  }
  // -- render ------------------------------------------------------------
  render() {
    const e = this._suggestions.size, t = this._candidates.length;
    return p`
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
              @change=${(s) => {
      this._missingAlt = s.target.checked;
    }}
            ></uui-toggle>
            <uui-toggle
              label="Poor / generic name"
              ?checked=${this._poorName}
              @change=${(s) => {
      this._poorName = s.target.checked;
    }}
            ></uui-toggle>
            <div class="language-field">
              <label for="response-language">Response language</label>
              <select
                id="response-language"
                class="language-picker"
                @change=${(s) => {
      this._language = s.target.value;
    }}
              >
                <option value="" ?selected=${this._language === ""}>
                  Site default
                </option>
                ${this._languages.map(
      (s) => p`
                    <option value=${s.isoCode} ?selected=${s.isoCode === this._language}>
                      ${s.name}${s.isDefault ? " (default)" : ""}
                    </option>
                  `
    )}
              </select>
            </div>
            <uui-button look="secondary" @click=${() => d(this, c, X).call(this)}>
              Refresh list
            </uui-button>
            <uui-button
              look="primary"
              color="positive"
              ?disabled=${this._bulkRunning || t === 0}
              @click=${() => d(this, c, ye).call(this)}
            >
              ${this._bulkRunning ? `Analysing ${this._bulkProgress} / ${this._bulkTotal}…` : `Analyse all images (${t})`}
            </uui-button>
            <span class="muted small"
              >${e} of ${t} analysed</span
            >
          </div>

          ${this._bulkRunning ? p`<uui-loader-bar></uui-loader-bar>` : null}
          ${this._error ? p`<p class="error">${this._error}</p>` : null}
        </uui-box>

        ${this._loading ? p`<uui-loader></uui-loader>` : this._candidates.length === 0 ? p`<uui-box
                ><p>No images need attention with the current filters.</p></uui-box
              >` : d(this, c, xe).call(this)}
      </umb-body-layout>
    `;
  }
};
A = /* @__PURE__ */ new WeakMap();
j = /* @__PURE__ */ new WeakMap();
c = /* @__PURE__ */ new WeakSet();
me = async function() {
  try {
    const { data: e } = await W.get({
      url: `${B}/folders`,
      security: D
    });
    this._folders = e ?? [];
  } catch {
    this._folders = [];
  }
};
_e = async function() {
  try {
    const { data: e } = await W.get({
      url: `${B}/languages`,
      security: D
    });
    this._languages = e ?? [];
  } catch {
    this._languages = [];
  }
};
X = async function() {
  this._loading = !0, this._error = void 0;
  try {
    const { data: e, error: t, response: s } = await W.get({
      url: `${B}/candidates`,
      security: D,
      query: {
        missingAlt: this._missingAlt,
        poorName: this._poorName,
        skip: 0,
        take: 50
      }
    });
    if (t || !e)
      throw new Error(`Failed to load candidates (${s.status})`);
    this._candidates = e.items;
    const i = new Set(e.items.map((o) => o.key)), a = /* @__PURE__ */ new Map();
    for (const [o, r] of this._suggestions)
      i.has(o) && a.set(o, r);
    this._suggestions = a;
  } catch (e) {
    this._error = e.message;
  } finally {
    this._loading = !1;
  }
};
te = async function(e) {
  const t = new Set(this._busyKeys);
  t.add(e), this._busyKeys = t;
  try {
    const { data: s, error: i, response: a } = await W.post({
      url: `${B}/analyze`,
      security: D,
      body: { mediaKey: e, ...this._language ? { language: this._language } : {} }
    });
    if (i || !s)
      throw new Error(Ae(i, `Analyze failed (${a.status})`));
    const o = new Map(this._suggestions);
    o.set(e, s), this._suggestions = o;
    const r = new Map(this._moveTarget);
    r.set(e, d(this, c, se).call(this, s)), this._moveTarget = r, this._nameEdits = d(this, c, M).call(this, this._nameEdits, e, s.name), this._altEdits = d(this, c, M).call(this, this._altEdits, e, s.altText), this._captionEdits = d(this, c, M).call(this, this._captionEdits, e, s.caption), this._newFolderEdits = d(this, c, M).call(this, this._newFolderEdits, e, s.folder?.newFolderName), d(this, c, ie).call(this, e);
  } catch (s) {
    O(this, A)?.peek("danger", {
      data: { headline: "Analyze failed", message: s.message }
    });
  } finally {
    const s = new Set(this._busyKeys);
    s.delete(e), this._busyKeys = s;
  }
};
ye = async function() {
  if (this._candidates.length === 0 || this._bulkRunning) return;
  this._bulkRunning = !0, this._bulkProgress = 0, this._bulkTotal = this._candidates.length;
  const e = [...this._candidates], t = Array.from({ length: rt }, async () => {
    for (; e.length > 0; ) {
      const s = e.shift();
      if (!s) return;
      await d(this, c, te).call(this, s.key), this._bulkProgress = this._bulkProgress + 1;
    }
  });
  try {
    await Promise.all(t), O(this, A)?.peek("positive", {
      data: {
        headline: "Analysis complete",
        message: `Analysed ${this._bulkTotal} item${this._bulkTotal === 1 ? "" : "s"}.`
      }
    });
  } finally {
    this._bulkRunning = !1;
  }
};
we = async function(e) {
  const t = this._suggestions.get(e);
  if (!t) return;
  const s = { mediaKey: e }, i = d(this, c, H).call(this, "name", e, this._nameEdits, t.name);
  i && (s.name = i);
  const a = d(this, c, H).call(this, "alt", e, this._altEdits, t.altText);
  a && (s.altText = a);
  const o = d(this, c, H).call(this, "caption", e, this._captionEdits, t.caption);
  if (o && (s.caption = o), this._moveEnabled.has(e)) {
    const n = this._moveTarget.get(e) ?? R;
    if (n === q) {
      const l = (this._newFolderEdits.get(e) ?? t.folder?.newFolderName ?? "").trim();
      l && (s.newFolderName = l);
    } else n !== R && (s.targetFolderKey = n);
  }
  if (Object.keys(s).length === 1) {
    O(this, A)?.peek("warning", {
      data: { headline: "Nothing to apply", message: "The suggestion is empty for this item." }
    });
    return;
  }
  const r = new Set(this._busyKeys);
  r.add(e), this._busyKeys = r;
  try {
    const { error: n, response: l } = await W.post({
      url: `${B}/apply`,
      security: D,
      body: s
    });
    if (n)
      throw new Error(Ae(n, `Apply failed (${l.status})`));
    O(this, A)?.peek("positive", {
      data: {
        headline: "Applied",
        message: `Updated ${i || "media item"}`
      }
    }), this._candidates = this._candidates.filter((T) => T.key !== e);
    const h = new Map(this._suggestions);
    h.delete(e), this._suggestions = h;
    const u = new Set(this._moveEnabled);
    u.delete(e), this._moveEnabled = u;
    const _ = new Map(this._moveTarget);
    _.delete(e), this._moveTarget = _, this._nameEdits = d(this, c, F).call(this, this._nameEdits, e), this._altEdits = d(this, c, F).call(this, this._altEdits, e), this._captionEdits = d(this, c, F).call(this, this._captionEdits, e), this._newFolderEdits = d(this, c, F).call(this, this._newFolderEdits, e), d(this, c, ie).call(this, e);
  } catch (n) {
    O(this, A)?.peek("danger", {
      data: { headline: "Apply failed", message: n.message }
    });
  } finally {
    const n = new Set(this._busyKeys);
    n.delete(e), this._busyKeys = n;
  }
};
se = function(e) {
  return e.folder?.targetFolderKey ? e.folder.targetFolderKey : e.folder?.newFolderName ? q : R;
};
ve = function(e, t) {
  const s = new Set(this._moveEnabled);
  t ? s.add(e) : s.delete(e), this._moveEnabled = s;
};
$e = function(e, t) {
  const s = new Map(this._moveTarget);
  s.set(e, t), this._moveTarget = s;
};
M = function(e, t, s) {
  const i = new Map(e);
  return s ? i.set(t, s) : i.delete(t), i;
};
F = function(e, t) {
  const s = new Map(e);
  return s.delete(t), s;
};
x = function(e, t) {
  return `${e}:${t}`;
};
I = function(e, t, s) {
  const i = new Set(this._editing);
  s ? (i.add(d(this, c, x).call(this, e, t)), Y(this, j, d(this, c, x).call(this, e, t))) : i.delete(d(this, c, x).call(this, e, t)), this._editing = i;
};
Z = function(e, t, s) {
  const i = new Set(this._dismissed);
  s ? i.add(d(this, c, x).call(this, e, t)) : i.delete(d(this, c, x).call(this, e, t)), this._dismissed = i, s && d(this, c, I).call(this, e, t, !1);
};
ie = function(e) {
  const t = `:${e}`;
  this._dismissed = new Set([...this._dismissed].filter((s) => !s.endsWith(t))), this._editing = new Set([...this._editing].filter((s) => !s.endsWith(t)));
};
H = function(e, t, s, i) {
  return this._dismissed.has(d(this, c, x).call(this, e, t)) ? "" : (s.get(t) ?? i ?? "").trim();
};
xe = function() {
  return p`
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
          ${je(this._candidates, (e) => e.key, (e) => d(this, c, Ee).call(this, e))}
        </uui-table>
        </div>
      </uui-box>
    `;
};
Ee = function(e) {
  const t = this._suggestions.get(e.key), s = this._busyKeys.has(e.key);
  return p`
      <uui-table-row class=${s ? "row-busy" : ""}>
        <uui-table-cell>
          <div class="file-cell">
            <strong title=${e.name}>${e.name}</strong>
            <span class="muted small" title=${e.folderPath ?? "/"}
              >${e.folderPath ?? "/"}</span
            >
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <div class="tags">
            ${e.missingAlt ? p`<uui-tag color="danger" look="primary" size="s">no alt</uui-tag>` : null}
            ${e.poorName ? p`<uui-tag color="warning" look="primary" size="s"
                  >generic name</uui-tag
                >` : null}
          </div>
        </uui-table-cell>
        <uui-table-cell>
          <span class=${e.currentAltText ? "" : "muted"}
            >${e.currentAltText ?? "—"}</span
          >
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, c, L).call(this, "name", e.key, this._nameEdits, t?.name, (i) => this._nameEdits = i, "suggested name")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, c, L).call(this, "alt", e.key, this._altEdits, t?.altText, (i) => this._altEdits = i, "suggested alt text")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, c, L).call(this, "caption", e.key, this._captionEdits, t?.caption, (i) => this._captionEdits = i, "caption")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, c, ke).call(this, e, t)}
        </uui-table-cell>
        <uui-table-cell>
          ${t ? t.uncertain ? p`<uui-tag color="warning" size="s" title=${t.note ?? ""}
                  >uncertain</uui-tag
                >` : p`<uui-tag color="positive" size="s">ok</uui-tag>` : p`<span class="muted">—</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              size="s"
              look="secondary"
              ?disabled=${s || this._bulkRunning}
              @click=${() => d(this, c, te).call(this, e.key)}
            >
              ${t ? "Re-analyse" : "Analyse"}
            </uui-button>
            <uui-button
              size="s"
              look="primary"
              color="positive"
              ?disabled=${s || !t}
              @click=${() => d(this, c, we).call(this, e.key)}
            >
              Apply
            </uui-button>
            ${s ? p`<uui-loader-circle></uui-loader-circle>` : null}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
};
L = function(e, t, s, i, a, o) {
  const r = s.get(t) ?? i ?? "";
  return !r && !this._editing.has(d(this, c, x).call(this, e, t)) ? p`<span class="muted">—</span>` : this._dismissed.has(d(this, c, x).call(this, e, t)) ? p`
        <span class="suggestion-chip suggestion-chip--removed">
          <span class="suggestion-chip__text">Removed</span>
          <uui-button
            class="suggestion-chip__btn suggestion-chip__btn--muted"
            compact
            label="Restore ${o}"
            @click=${() => d(this, c, Z).call(this, e, t, !1)}
          >
            <umb-icon name="icon-undo"></umb-icon>
          </uui-button>
        </span>
      ` : this._editing.has(d(this, c, x).call(this, e, t)) ? p`
        <span class="suggestion-edit">
          <uui-input
            class="cell-input"
            label=${o}
            data-edit-key=${d(this, c, x).call(this, e, t)}
            .value=${r}
            @input=${(n) => {
    const l = new Map(s);
    l.set(t, n.target.value), a(l);
  }}
            @keydown=${(n) => {
    n.key === "Enter" && d(this, c, I).call(this, e, t, !1);
  }}
          ></uui-input>
          <uui-button
            look="primary"
            color="positive"
            compact
            label="Done editing ${o}"
            @click=${() => d(this, c, I).call(this, e, t, !1)}
          >
            <umb-icon name="icon-check"></umb-icon>
          </uui-button>
        </span>
      ` : p`
      <span class="suggestion-chip">
        <span class="suggestion-chip__text" title=${r}>${r}</span>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Edit ${o}"
          @click=${() => d(this, c, I).call(this, e, t, !0)}
        >
          <umb-icon name="icon-edit"></umb-icon>
        </uui-button>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Remove ${o}"
          @click=${() => d(this, c, Z).call(this, e, t, !0)}
        >
          <umb-icon name="icon-wrong"></umb-icon>
        </uui-button>
      </span>
    `;
};
ke = function(e, t) {
  const s = t?.currentFolderPath ?? e.folderPath ?? "/";
  if (!t || !t.folder?.isChange)
    return p`
        <div class="folder-cell">
          <span class="muted small">${s}</span>
          ${t ? p`<span class="muted small">no move suggested</span>` : null}
        </div>
      `;
  const i = t.folder, a = this._newFolderEdits.get(e.key) ?? i.newFolderName, o = i.newFolderName ? `＋ new: ${a}` : i.targetPath ?? "", r = this._moveEnabled.has(e.key), n = this._moveTarget.get(e.key) ?? d(this, c, se).call(this, t);
  return p`
      <div class="folder-cell">
        <span class="muted small">${s}</span>
        <span class="folder-arrow">
          →
          <span class="suggestion-chip" title=${i.reason ?? ""}>
            <span class="suggestion-chip__text">${o}</span>
          </span>
        </span>
        <uui-toggle
          label="Move"
          ?checked=${r}
          @change=${(l) => d(this, c, ve).call(this, e.key, l.target.checked)}
        ></uui-toggle>
        ${r ? d(this, c, Se).call(this, e.key, i, n) : null}
        ${r && n === q ? p`<uui-input
              class="cell-input"
              label="New folder name"
              .value=${a ?? ""}
              @input=${(l) => {
    const h = new Map(this._newFolderEdits);
    h.set(e.key, l.target.value), this._newFolderEdits = h;
  }}
            ></uui-input>` : null}
      </div>
    `;
};
Se = function(e, t, s) {
  return p`
      <select
        class="folder-picker"
        @change=${(i) => d(this, c, $e).call(this, e, i.target.value)}
      >
        <option value=${R} ?selected=${s === R}>
          Don't move
        </option>
        ${t.newFolderName ? p`<option value=${q} ?selected=${s === q}>
              Create new folder…
            </option>` : null}
        ${this._folders.map(
    (i) => p`
            <option value=${i.key} ?selected=${s === i.key}>
              ${i.displayPath}
            </option>
          `
  )}
      </select>
    `;
};
f.styles = [
  Pe`
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
      .language-field {
        display: flex;
        align-items: center;
        gap: var(--uui-size-space-2);
      }
      .language-picker {
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
    `
];
b([
  m()
], f.prototype, "_missingAlt", 2);
b([
  m()
], f.prototype, "_poorName", 2);
b([
  m()
], f.prototype, "_loading", 2);
b([
  m()
], f.prototype, "_candidates", 2);
b([
  m()
], f.prototype, "_folders", 2);
b([
  m()
], f.prototype, "_languages", 2);
b([
  m()
], f.prototype, "_language", 2);
b([
  m()
], f.prototype, "_suggestions", 2);
b([
  m()
], f.prototype, "_busyKeys", 2);
b([
  m()
], f.prototype, "_moveEnabled", 2);
b([
  m()
], f.prototype, "_moveTarget", 2);
b([
  m()
], f.prototype, "_nameEdits", 2);
b([
  m()
], f.prototype, "_altEdits", 2);
b([
  m()
], f.prototype, "_captionEdits", 2);
b([
  m()
], f.prototype, "_newFolderEdits", 2);
b([
  m()
], f.prototype, "_dismissed", 2);
b([
  m()
], f.prototype, "_editing", 2);
b([
  m()
], f.prototype, "_bulkRunning", 2);
b([
  m()
], f.prototype, "_bulkProgress", 2);
b([
  m()
], f.prototype, "_bulkTotal", 2);
b([
  m()
], f.prototype, "_error", 2);
f = b([
  Me("ai-media-assistant-workspace")
], f);
const dt = f;
export {
  f as AIMediaAssistantWorkspaceElement,
  dt as default
};
//# sourceMappingURL=workspace.element-DC_iLsjC.js.map
