import { LitElement as Ce, html as f, repeat as Ne, css as Oe, state as _, customElement as je } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as Pe } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as Fe } from "@umbraco-cms/backoffice/notification";
import { umbHttpClient as Me } from "@umbraco-cms/backoffice/http-client";
const Ie = {
  bodySerializer: (e) => JSON.stringify(
    e,
    (t, s) => typeof s == "bigint" ? s.toString() : s
  )
}, Re = ({
  onRequest: e,
  onSseError: t,
  onSseEvent: s,
  responseTransformer: i,
  responseValidator: a,
  sseDefaultRetryDelay: o,
  sseMaxRetryAttempts: n,
  sseMaxRetryDelay: r,
  sseSleepFn: l,
  url: h,
  ...c
}) => {
  let m;
  const T = l ?? ((p) => new Promise((w) => setTimeout(w, p)));
  return { stream: async function* () {
    let p = o ?? 3e3, w = 0;
    const z = c.signal ?? new AbortController().signal;
    for (; !z.aborted; ) {
      w++;
      const P = c.headers instanceof Headers ? c.headers : new Headers(c.headers);
      m !== void 0 && P.set("Last-Event-ID", m);
      try {
        const C = {
          redirect: "follow",
          ...c,
          body: c.serializedBody,
          headers: P,
          signal: z
        };
        let x = new Request(h, C);
        e && (x = await e(h, C));
        const v = await (c.fetch ?? globalThis.fetch)(x);
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
            const { done: Se, value: Ae } = await k.read();
            if (Se) break;
            J += Ae;
            const re = J.split(`

`);
            J = re.pop() ?? "";
            for (const Te of re) {
              const ze = Te.split(`
`), B = [];
              let ne;
              for (const $ of ze)
                if ($.startsWith("data:"))
                  B.push($.replace(/^data:\s*/, ""));
                else if ($.startsWith("event:"))
                  ne = $.replace(/^event:\s*/, "");
                else if ($.startsWith("id:"))
                  m = $.replace(/^id:\s*/, "");
                else if ($.startsWith("retry:")) {
                  const le = Number.parseInt(
                    $.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(le) || (p = le);
                }
              let N, oe = !1;
              if (B.length) {
                const $ = B.join(`
`);
                try {
                  N = JSON.parse($), oe = !0;
                } catch {
                  N = $;
                }
              }
              oe && (a && await a(N), i && (N = await i(N))), s?.({
                data: N,
                event: ne,
                id: m,
                retry: p
              }), B.length && (yield N);
            }
          }
        } finally {
          z.removeEventListener("abort", ae), k.releaseLock();
        }
        break;
      } catch (C) {
        if (t?.(C), n !== void 0 && w >= n)
          break;
        const x = Math.min(
          p * 2 ** (w - 1),
          r ?? 3e4
        );
        await T(x);
      }
    }
  }() };
}, qe = (e) => {
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
}, We = (e) => {
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
}, de = ({
  allowReserved: e,
  explode: t,
  name: s,
  style: i,
  value: a
}) => {
  if (!t) {
    const r = (e ? a : a.map((l) => encodeURIComponent(l))).join(We(i));
    switch (i) {
      case "label":
        return `.${r}`;
      case "matrix":
        return `;${s}=${r}`;
      case "simple":
        return r;
      default:
        return `${s}=${r}`;
    }
  }
  const o = qe(i), n = a.map((r) => i === "label" || i === "simple" ? e ? r : encodeURIComponent(r) : K({
    allowReserved: e,
    name: s,
    value: r
  })).join(o);
  return i === "label" || i === "matrix" ? o + n : n;
}, K = ({
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
    Object.entries(a).forEach(([c, m]) => {
      l = [
        ...l,
        c,
        e ? m : encodeURIComponent(m)
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
  const n = Be(i), r = Object.entries(a).map(
    ([l, h]) => K({
      allowReserved: e,
      name: i === "deepObject" ? `${s}[${l}]` : l,
      value: h
    })
  ).join(n);
  return i === "label" || i === "matrix" ? n + r : r;
}, Ue = /\{[^{}]+\}/g, De = ({ path: e, url: t }) => {
  let s = t;
  const i = t.match(Ue);
  if (i)
    for (const a of i) {
      let o = !1, n = a.substring(1, a.length - 1), r = "simple";
      n.endsWith("*") && (o = !0, n = n.substring(0, n.length - 1)), n.startsWith(".") ? (n = n.substring(1), r = "label") : n.startsWith(";") && (n = n.substring(1), r = "matrix");
      const l = e[n];
      if (l == null)
        continue;
      if (Array.isArray(l)) {
        s = s.replace(
          a,
          de({ explode: o, name: n, style: r, value: l })
        );
        continue;
      }
      if (typeof l == "object") {
        s = s.replace(
          a,
          he({
            explode: o,
            name: n,
            style: r,
            value: l,
            valueOnly: !0
          })
        );
        continue;
      }
      if (r === "matrix") {
        s = s.replace(
          a,
          `;${K({
            name: n,
            value: l
          })}`
        );
        continue;
      }
      const h = encodeURIComponent(
        r === "label" ? `.${l}` : l
      );
      s = s.replace(a, h);
    }
  return s;
}, Ke = ({
  baseUrl: e,
  path: t,
  query: s,
  querySerializer: i,
  url: a
}) => {
  const o = a.startsWith("/") ? a : `/${a}`;
  let n = (e ?? "") + o;
  t && (n = De({ path: t, url: n }));
  let r = s ? i(s) : "";
  return r.startsWith("?") && (r = r.substring(1)), r && (n += `?${r}`), n;
};
function He(e) {
  const t = e.body !== void 0;
  if (t && e.bodySerializer)
    return "serializedBody" in e ? e.serializedBody !== void 0 && e.serializedBody !== "" ? e.serializedBody : null : e.body !== "" ? e.body : null;
  if (t)
    return e.body;
}
const Ve = async (e, t) => {
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
    for (const n in a) {
      const r = a[n];
      if (r != null)
        if (Array.isArray(r)) {
          const l = de({
            allowReserved: e,
            explode: !0,
            name: n,
            style: "form",
            value: r,
            ...t
          });
          l && o.push(l);
        } else if (typeof r == "object") {
          const l = he({
            allowReserved: e,
            explode: !0,
            name: n,
            style: "deepObject",
            value: r,
            ...s
          });
          l && o.push(l);
        } else {
          const l = K({
            allowReserved: e,
            name: n,
            value: r
          });
          l && o.push(l);
        }
    }
  return o.join("&");
}, Le = (e) => {
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
}, Je = (e, t) => t ? !!(e.headers.has(t) || e.query?.[t] || e.headers.get("Cookie")?.includes(`${t}=`)) : !1, Ge = async ({
  security: e,
  ...t
}) => {
  for (const s of e) {
    if (Je(t, s.name))
      continue;
    const i = await Ve(s, t.auth);
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
}, ce = (e) => Ke({
  baseUrl: e.baseUrl,
  path: e.path,
  query: e.query,
  querySerializer: typeof e.querySerializer == "function" ? e.querySerializer : pe(e.querySerializer),
  url: e.url
}), ue = (e, t) => {
  const s = { ...e, ...t };
  return s.baseUrl?.endsWith("/") && (s.baseUrl = s.baseUrl.substring(0, s.baseUrl.length - 1)), s.headers = fe(e.headers, t.headers), s;
}, Qe = (e) => {
  const t = [];
  return e.forEach((s, i) => {
    t.push([i, s]);
  }), t;
}, fe = (...e) => {
  const t = new Headers();
  for (const s of e) {
    if (!s)
      continue;
    const i = s instanceof Headers ? Qe(s) : Object.entries(s);
    for (const [a, o] of i)
      if (o === null)
        t.delete(a);
      else if (Array.isArray(o))
        for (const n of o)
          t.append(a, n);
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
const Ye = () => ({
  error: new G(),
  request: new G(),
  response: new G()
}), Xe = pe({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), Ze = {
  "Content-Type": "application/json"
}, ge = (e = {}) => ({
  ...Ie,
  headers: Ze,
  parseAs: "auto",
  querySerializer: Xe,
  ...e
}), et = (e = {}) => {
  let t = ue(ge(), e);
  const s = () => ({ ...t }), i = (h) => (t = ue(t, h), s()), a = Ye(), o = async (h) => {
    const c = {
      ...t,
      ...h,
      fetch: h.fetch ?? t.fetch ?? globalThis.fetch,
      headers: fe(t.headers, h.headers),
      serializedBody: void 0
    };
    c.security && await Ge({
      ...c,
      security: c.security
    }), c.requestValidator && await c.requestValidator(c), c.body !== void 0 && c.bodySerializer && (c.serializedBody = c.bodySerializer(c.body)), (c.body === void 0 || c.serializedBody === "") && c.headers.delete("Content-Type");
    const m = ce(c);
    return { opts: c, url: m };
  }, n = async (h) => {
    const { opts: c, url: m } = await o(h), T = {
      redirect: "follow",
      ...c,
      body: He(c)
    };
    let S = new Request(m, T);
    for (const y of a.request.fns)
      y && (S = await y(S, c));
    const W = c.fetch;
    let p = await W(S);
    for (const y of a.response.fns)
      y && (p = await y(p, S, c));
    const w = {
      request: S,
      response: p
    };
    if (p.ok) {
      const y = (c.parseAs === "auto" ? Le(p.headers.get("Content-Type")) : c.parseAs) ?? "json";
      if (p.status === 204 || p.headers.get("Content-Length") === "0") {
        let k;
        switch (y) {
          case "arrayBuffer":
          case "blob":
          case "text":
            k = await p[y]();
            break;
          case "formData":
            k = new FormData();
            break;
          case "stream":
            k = p.body;
            break;
          default:
            k = {};
            break;
        }
        return c.responseStyle === "data" ? k : {
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
          v = await p[y]();
          break;
        case "stream":
          return c.responseStyle === "data" ? p.body : {
            data: p.body,
            ...w
          };
      }
      return y === "json" && (c.responseValidator && await c.responseValidator(v), c.responseTransformer && (v = await c.responseTransformer(v))), c.responseStyle === "data" ? v : {
        data: v,
        ...w
      };
    }
    const z = await p.text();
    let P;
    try {
      P = JSON.parse(z);
    } catch {
    }
    const C = P ?? z;
    let x = C;
    for (const y of a.error.fns)
      y && (x = await y(C, p, S, c));
    if (x = x || {}, c.throwOnError)
      throw x;
    return c.responseStyle === "data" ? void 0 : {
      error: x,
      ...w
    };
  }, r = (h) => (c) => n({ ...c, method: h }), l = (h) => async (c) => {
    const { opts: m, url: T } = await o(c);
    return Re({
      ...m,
      body: m.body,
      headers: m.headers,
      method: h,
      onRequest: async (S, W) => {
        let p = new Request(S, W);
        for (const w of a.request.fns)
          w && (p = await w(p, m));
        return p;
      },
      url: T
    });
  };
  return {
    buildUrl: ce,
    connect: r("CONNECT"),
    delete: r("DELETE"),
    get: r("GET"),
    getConfig: s,
    head: r("HEAD"),
    interceptors: a,
    options: r("OPTIONS"),
    patch: r("PATCH"),
    post: r("POST"),
    put: r("PUT"),
    request: n,
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
    trace: r("TRACE")
  };
}, tt = (e) => ({
  ...e,
  ...Me.getConfig()
}), H = et(tt(ge({
  baseUrl: "https://localhost:44338"
})));
var st = Object.defineProperty, it = Object.getOwnPropertyDescriptor, be = (e) => {
  throw TypeError(e);
}, b = (e, t, s, i) => {
  for (var a = i > 1 ? void 0 : i ? it(t, s) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (a = (i ? n(t, s, a) : n(a)) || a);
  return i && a && st(t, s, a), a;
}, ee = (e, t, s) => t.has(e) || be("Cannot " + s), O = (e, t, s) => (ee(e, t, "read from private field"), t.get(e)), Q = (e, t, s) => t.has(e) ? be("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, s), Y = (e, t, s, i) => (ee(e, t, "write to private field"), t.set(e, s), s), d = (e, t, s) => (ee(e, t, "access private method"), s), A, j, u, me, X, te, _e, ye, se, we, ve, F, M, E, I, Z, ie, U, $e, Ee, D, xe, ke;
const V = "/umbraco/aimediajanitor/api/v1", L = [{ scheme: "bearer", type: "http" }], R = "none", q = "new", at = 2;
let g = class extends Pe(Ce) {
  constructor() {
    super(), Q(this, u), this._missingAlt = !0, this._poorName = !0, this._loading = !1, this._candidates = [], this._folders = [], this._suggestions = /* @__PURE__ */ new Map(), this._busyKeys = /* @__PURE__ */ new Set(), this._moveEnabled = /* @__PURE__ */ new Set(), this._moveTarget = /* @__PURE__ */ new Map(), this._nameEdits = /* @__PURE__ */ new Map(), this._altEdits = /* @__PURE__ */ new Map(), this._captionEdits = /* @__PURE__ */ new Map(), this._newFolderEdits = /* @__PURE__ */ new Map(), this._dismissed = /* @__PURE__ */ new Set(), this._editing = /* @__PURE__ */ new Set(), this._bulkRunning = !1, this._bulkProgress = 0, this._bulkTotal = 0, Q(this, A), Q(this, j, null), this.consumeContext(Fe, (e) => {
      Y(this, A, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), d(this, u, X).call(this), d(this, u, me).call(this);
  }
  updated(e) {
    if (super.updated(e), !O(this, j)) return;
    const t = `uui-input[data-edit-key="${CSS.escape(O(this, j))}"]`;
    this.shadowRoot?.querySelector(t)?.focus(), Y(this, j, null);
  }
  // -- render ------------------------------------------------------------
  render() {
    const e = this._suggestions.size, t = this._candidates.length;
    return f`
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
            <uui-button look="secondary" @click=${() => d(this, u, X).call(this)}>
              Refresh list
            </uui-button>
            <uui-button
              look="primary"
              color="positive"
              ?disabled=${this._bulkRunning || t === 0}
              @click=${() => d(this, u, _e).call(this)}
            >
              ${this._bulkRunning ? `Analysing ${this._bulkProgress} / ${this._bulkTotal}…` : `Analyse all images (${t})`}
            </uui-button>
            <span class="muted small"
              >${e} of ${t} analysed</span
            >
          </div>

          ${this._bulkRunning ? f`<uui-loader-bar></uui-loader-bar>` : null}
          ${this._error ? f`<p class="error">${this._error}</p>` : null}
        </uui-box>

        ${this._loading ? f`<uui-loader></uui-loader>` : this._candidates.length === 0 ? f`<uui-box
                ><p>No images need attention with the current filters.</p></uui-box
              >` : d(this, u, $e).call(this)}
      </umb-body-layout>
    `;
  }
};
A = /* @__PURE__ */ new WeakMap();
j = /* @__PURE__ */ new WeakMap();
u = /* @__PURE__ */ new WeakSet();
me = async function() {
  try {
    const { data: e } = await H.get({
      url: `${V}/folders`,
      security: L
    });
    this._folders = e ?? [];
  } catch {
    this._folders = [];
  }
};
X = async function() {
  this._loading = !0, this._error = void 0;
  try {
    const { data: e, error: t, response: s } = await H.get({
      url: `${V}/candidates`,
      security: L,
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
    for (const [o, n] of this._suggestions)
      i.has(o) && a.set(o, n);
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
    const { data: s, error: i, response: a } = await H.post({
      url: `${V}/analyze`,
      security: L,
      body: { mediaKey: e }
    });
    if (i || !s)
      throw new Error(`Analyze failed (${a.status})`);
    const o = new Map(this._suggestions);
    o.set(e, s), this._suggestions = o;
    const n = new Map(this._moveTarget);
    n.set(e, d(this, u, se).call(this, s)), this._moveTarget = n, this._nameEdits = d(this, u, F).call(this, this._nameEdits, e, s.name), this._altEdits = d(this, u, F).call(this, this._altEdits, e, s.altText), this._captionEdits = d(this, u, F).call(this, this._captionEdits, e, s.caption), this._newFolderEdits = d(this, u, F).call(this, this._newFolderEdits, e, s.folder?.newFolderName), d(this, u, ie).call(this, e);
  } catch (s) {
    O(this, A)?.peek("danger", {
      data: { headline: "Analyze failed", message: s.message }
    });
  } finally {
    const s = new Set(this._busyKeys);
    s.delete(e), this._busyKeys = s;
  }
};
_e = async function() {
  if (this._candidates.length === 0 || this._bulkRunning) return;
  this._bulkRunning = !0, this._bulkProgress = 0, this._bulkTotal = this._candidates.length;
  const e = [...this._candidates], t = Array.from({ length: at }, async () => {
    for (; e.length > 0; ) {
      const s = e.shift();
      if (!s) return;
      await d(this, u, te).call(this, s.key), this._bulkProgress = this._bulkProgress + 1;
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
ye = async function(e) {
  const t = this._suggestions.get(e);
  if (!t) return;
  const s = { mediaKey: e }, i = d(this, u, U).call(this, "name", e, this._nameEdits, t.name);
  i && (s.name = i);
  const a = d(this, u, U).call(this, "alt", e, this._altEdits, t.altText);
  a && (s.altText = a);
  const o = d(this, u, U).call(this, "caption", e, this._captionEdits, t.caption);
  if (o && (s.caption = o), this._moveEnabled.has(e)) {
    const r = this._moveTarget.get(e) ?? R;
    if (r === q) {
      const l = (this._newFolderEdits.get(e) ?? t.folder?.newFolderName ?? "").trim();
      l && (s.newFolderName = l);
    } else r !== R && (s.targetFolderKey = r);
  }
  if (Object.keys(s).length === 1) {
    O(this, A)?.peek("warning", {
      data: { headline: "Nothing to apply", message: "The suggestion is empty for this item." }
    });
    return;
  }
  const n = new Set(this._busyKeys);
  n.add(e), this._busyKeys = n;
  try {
    const { error: r, response: l } = await H.post({
      url: `${V}/apply`,
      security: L,
      body: s
    });
    if (r)
      throw new Error(`Apply failed (${l.status})`);
    O(this, A)?.peek("positive", {
      data: {
        headline: "Applied",
        message: `Updated ${i || "media item"}`
      }
    }), this._candidates = this._candidates.filter((T) => T.key !== e);
    const h = new Map(this._suggestions);
    h.delete(e), this._suggestions = h;
    const c = new Set(this._moveEnabled);
    c.delete(e), this._moveEnabled = c;
    const m = new Map(this._moveTarget);
    m.delete(e), this._moveTarget = m, this._nameEdits = d(this, u, M).call(this, this._nameEdits, e), this._altEdits = d(this, u, M).call(this, this._altEdits, e), this._captionEdits = d(this, u, M).call(this, this._captionEdits, e), this._newFolderEdits = d(this, u, M).call(this, this._newFolderEdits, e), d(this, u, ie).call(this, e);
  } catch (r) {
    O(this, A)?.peek("danger", {
      data: { headline: "Apply failed", message: r.message }
    });
  } finally {
    const r = new Set(this._busyKeys);
    r.delete(e), this._busyKeys = r;
  }
};
se = function(e) {
  return e.folder?.targetFolderKey ? e.folder.targetFolderKey : e.folder?.newFolderName ? q : R;
};
we = function(e, t) {
  const s = new Set(this._moveEnabled);
  t ? s.add(e) : s.delete(e), this._moveEnabled = s;
};
ve = function(e, t) {
  const s = new Map(this._moveTarget);
  s.set(e, t), this._moveTarget = s;
};
F = function(e, t, s) {
  const i = new Map(e);
  return s ? i.set(t, s) : i.delete(t), i;
};
M = function(e, t) {
  const s = new Map(e);
  return s.delete(t), s;
};
E = function(e, t) {
  return `${e}:${t}`;
};
I = function(e, t, s) {
  const i = new Set(this._editing);
  s ? (i.add(d(this, u, E).call(this, e, t)), Y(this, j, d(this, u, E).call(this, e, t))) : i.delete(d(this, u, E).call(this, e, t)), this._editing = i;
};
Z = function(e, t, s) {
  const i = new Set(this._dismissed);
  s ? i.add(d(this, u, E).call(this, e, t)) : i.delete(d(this, u, E).call(this, e, t)), this._dismissed = i, s && d(this, u, I).call(this, e, t, !1);
};
ie = function(e) {
  const t = `:${e}`;
  this._dismissed = new Set([...this._dismissed].filter((s) => !s.endsWith(t))), this._editing = new Set([...this._editing].filter((s) => !s.endsWith(t)));
};
U = function(e, t, s, i) {
  return this._dismissed.has(d(this, u, E).call(this, e, t)) ? "" : (s.get(t) ?? i ?? "").trim();
};
$e = function() {
  return f`
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
          ${Ne(this._candidates, (e) => e.key, (e) => d(this, u, Ee).call(this, e))}
        </uui-table>
        </div>
      </uui-box>
    `;
};
Ee = function(e) {
  const t = this._suggestions.get(e.key), s = this._busyKeys.has(e.key);
  return f`
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
            ${e.missingAlt ? f`<uui-tag color="danger" look="primary" size="s">no alt</uui-tag>` : null}
            ${e.poorName ? f`<uui-tag color="warning" look="primary" size="s"
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
          ${d(this, u, D).call(this, "name", e.key, this._nameEdits, t?.name, (i) => this._nameEdits = i, "suggested name")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, u, D).call(this, "alt", e.key, this._altEdits, t?.altText, (i) => this._altEdits = i, "suggested alt text")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, u, D).call(this, "caption", e.key, this._captionEdits, t?.caption, (i) => this._captionEdits = i, "caption")}
        </uui-table-cell>
        <uui-table-cell>
          ${d(this, u, xe).call(this, e, t)}
        </uui-table-cell>
        <uui-table-cell>
          ${t ? t.uncertain ? f`<uui-tag color="warning" size="s" title=${t.note ?? ""}
                  >uncertain</uui-tag
                >` : f`<uui-tag color="positive" size="s">ok</uui-tag>` : f`<span class="muted">—</span>`}
        </uui-table-cell>
        <uui-table-cell>
          <div class="actions">
            <uui-button
              size="s"
              look="secondary"
              ?disabled=${s || this._bulkRunning}
              @click=${() => d(this, u, te).call(this, e.key)}
            >
              ${t ? "Re-analyse" : "Analyse"}
            </uui-button>
            <uui-button
              size="s"
              look="primary"
              color="positive"
              ?disabled=${s || !t}
              @click=${() => d(this, u, ye).call(this, e.key)}
            >
              Apply
            </uui-button>
            ${s ? f`<uui-loader-circle></uui-loader-circle>` : null}
          </div>
        </uui-table-cell>
      </uui-table-row>
    `;
};
D = function(e, t, s, i, a, o) {
  const n = s.get(t) ?? i ?? "";
  return !n && !this._editing.has(d(this, u, E).call(this, e, t)) ? f`<span class="muted">—</span>` : this._dismissed.has(d(this, u, E).call(this, e, t)) ? f`
        <span class="suggestion-chip suggestion-chip--removed">
          <span class="suggestion-chip__text">Removed</span>
          <uui-button
            class="suggestion-chip__btn suggestion-chip__btn--muted"
            compact
            label="Restore ${o}"
            @click=${() => d(this, u, Z).call(this, e, t, !1)}
          >
            <umb-icon name="icon-undo"></umb-icon>
          </uui-button>
        </span>
      ` : this._editing.has(d(this, u, E).call(this, e, t)) ? f`
        <span class="suggestion-edit">
          <uui-input
            class="cell-input"
            label=${o}
            data-edit-key=${d(this, u, E).call(this, e, t)}
            .value=${n}
            @input=${(r) => {
    const l = new Map(s);
    l.set(t, r.target.value), a(l);
  }}
            @keydown=${(r) => {
    r.key === "Enter" && d(this, u, I).call(this, e, t, !1);
  }}
          ></uui-input>
          <uui-button
            look="primary"
            color="positive"
            compact
            label="Done editing ${o}"
            @click=${() => d(this, u, I).call(this, e, t, !1)}
          >
            <umb-icon name="icon-check"></umb-icon>
          </uui-button>
        </span>
      ` : f`
      <span class="suggestion-chip">
        <span class="suggestion-chip__text" title=${n}>${n}</span>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Edit ${o}"
          @click=${() => d(this, u, I).call(this, e, t, !0)}
        >
          <umb-icon name="icon-edit"></umb-icon>
        </uui-button>
        <uui-button
          class="suggestion-chip__btn"
          compact
          label="Remove ${o}"
          @click=${() => d(this, u, Z).call(this, e, t, !0)}
        >
          <umb-icon name="icon-wrong"></umb-icon>
        </uui-button>
      </span>
    `;
};
xe = function(e, t) {
  const s = t?.currentFolderPath ?? e.folderPath ?? "/";
  if (!t || !t.folder?.isChange)
    return f`
        <div class="folder-cell">
          <span class="muted small">${s}</span>
          ${t ? f`<span class="muted small">no move suggested</span>` : null}
        </div>
      `;
  const i = t.folder, a = this._newFolderEdits.get(e.key) ?? i.newFolderName, o = i.newFolderName ? `＋ new: ${a}` : i.targetPath ?? "", n = this._moveEnabled.has(e.key), r = this._moveTarget.get(e.key) ?? d(this, u, se).call(this, t);
  return f`
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
          ?checked=${n}
          @change=${(l) => d(this, u, we).call(this, e.key, l.target.checked)}
        ></uui-toggle>
        ${n ? d(this, u, ke).call(this, e.key, i, r) : null}
        ${n && r === q ? f`<uui-input
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
ke = function(e, t, s) {
  return f`
      <select
        class="folder-picker"
        @change=${(i) => d(this, u, ve).call(this, e, i.target.value)}
      >
        <option value=${R} ?selected=${s === R}>
          Don't move
        </option>
        ${t.newFolderName ? f`<option value=${q} ?selected=${s === q}>
              Create new folder…
            </option>` : null}
        ${this._folders.map(
    (i) => f`
            <option value=${i.key} ?selected=${s === i.key}>
              ${i.displayPath}
            </option>
          `
  )}
      </select>
    `;
};
g.styles = [
  Oe`
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
    `
];
b([
  _()
], g.prototype, "_missingAlt", 2);
b([
  _()
], g.prototype, "_poorName", 2);
b([
  _()
], g.prototype, "_loading", 2);
b([
  _()
], g.prototype, "_candidates", 2);
b([
  _()
], g.prototype, "_folders", 2);
b([
  _()
], g.prototype, "_suggestions", 2);
b([
  _()
], g.prototype, "_busyKeys", 2);
b([
  _()
], g.prototype, "_moveEnabled", 2);
b([
  _()
], g.prototype, "_moveTarget", 2);
b([
  _()
], g.prototype, "_nameEdits", 2);
b([
  _()
], g.prototype, "_altEdits", 2);
b([
  _()
], g.prototype, "_captionEdits", 2);
b([
  _()
], g.prototype, "_newFolderEdits", 2);
b([
  _()
], g.prototype, "_dismissed", 2);
b([
  _()
], g.prototype, "_editing", 2);
b([
  _()
], g.prototype, "_bulkRunning", 2);
b([
  _()
], g.prototype, "_bulkProgress", 2);
b([
  _()
], g.prototype, "_bulkTotal", 2);
b([
  _()
], g.prototype, "_error", 2);
g = b([
  je("ai-media-assistant-workspace")
], g);
const ct = g;
export {
  g as AIMediaAssistantWorkspaceElement,
  ct as default
};
//# sourceMappingURL=workspace.element-BtnqBC5-.js.map
