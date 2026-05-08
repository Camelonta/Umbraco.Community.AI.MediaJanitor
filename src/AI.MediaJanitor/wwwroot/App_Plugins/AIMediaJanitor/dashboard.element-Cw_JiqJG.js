import { LitElement as ne, html as V, css as oe, state as W, customElement as ce } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as ue } from "@umbraco-cms/backoffice/element-api";
import { UMB_NOTIFICATION_CONTEXT as le } from "@umbraco-cms/backoffice/notification";
import { UMB_CURRENT_USER_CONTEXT as de } from "@umbraco-cms/backoffice/current-user";
import { umbHttpClient as fe } from "@umbraco-cms/backoffice/http-client";
const he = {
  bodySerializer: (t) => JSON.stringify(
    t,
    (e, r) => typeof r == "bigint" ? r.toString() : r
  )
}, pe = ({
  onRequest: t,
  onSseError: e,
  onSseEvent: r,
  responseTransformer: a,
  responseValidator: s,
  sseDefaultRetryDelay: u,
  sseMaxRetryAttempts: o,
  sseMaxRetryDelay: n,
  sseSleepFn: c,
  url: d,
  ...i
}) => {
  let f;
  const E = c ?? ((l) => new Promise((p) => setTimeout(p, l)));
  return { stream: async function* () {
    let l = u ?? 3e3, p = 0;
    const x = i.signal ?? new AbortController().signal;
    for (; !x.aborted; ) {
      p++;
      const _ = i.headers instanceof Headers ? i.headers : new Headers(i.headers);
      f !== void 0 && _.set("Last-Event-ID", f);
      try {
        const S = {
          redirect: "follow",
          ...i,
          body: i.serializedBody,
          headers: _,
          signal: x
        };
        let b = new Request(d, S);
        t && (b = await t(d, S));
        const m = await (i.fetch ?? globalThis.fetch)(b);
        if (!m.ok)
          throw new Error(
            `SSE failed: ${m.status} ${m.statusText}`
          );
        if (!m.body) throw new Error("No body in SSE response");
        const g = m.body.pipeThrough(new TextDecoderStream()).getReader();
        let N = "";
        const B = () => {
          try {
            g.cancel();
          } catch {
          }
        };
        x.addEventListener("abort", B);
        try {
          for (; ; ) {
            const { done: re, value: ae } = await g.read();
            if (re) break;
            N += ae;
            const R = N.split(`

`);
            N = R.pop() ?? "";
            for (const se of R) {
              const ie = se.split(`
`), z = [];
              let H;
              for (const y of ie)
                if (y.startsWith("data:"))
                  z.push(y.replace(/^data:\s*/, ""));
                else if (y.startsWith("event:"))
                  H = y.replace(/^event:\s*/, "");
                else if (y.startsWith("id:"))
                  f = y.replace(/^id:\s*/, "");
                else if (y.startsWith("retry:")) {
                  const F = Number.parseInt(
                    y.replace(/^retry:\s*/, ""),
                    10
                  );
                  Number.isNaN(F) || (l = F);
                }
              let C, L = !1;
              if (z.length) {
                const y = z.join(`
`);
                try {
                  C = JSON.parse(y), L = !0;
                } catch {
                  C = y;
                }
              }
              L && (s && await s(C), a && (C = await a(C))), r?.({
                data: C,
                event: H,
                id: f,
                retry: l
              }), z.length && (yield C);
            }
          }
        } finally {
          x.removeEventListener("abort", B), g.releaseLock();
        }
        break;
      } catch (S) {
        if (e?.(S), o !== void 0 && p >= o)
          break;
        const b = Math.min(
          l * 2 ** (p - 1),
          n ?? 3e4
        );
        await E(b);
      }
    }
  }() };
}, me = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, ye = (t) => {
  switch (t) {
    case "form":
      return ",";
    case "pipeDelimited":
      return "|";
    case "spaceDelimited":
      return "%20";
    default:
      return ",";
  }
}, be = (t) => {
  switch (t) {
    case "label":
      return ".";
    case "matrix":
      return ";";
    case "simple":
      return ",";
    default:
      return "&";
  }
}, X = ({
  allowReserved: t,
  explode: e,
  name: r,
  style: a,
  value: s
}) => {
  if (!e) {
    const n = (t ? s : s.map((c) => encodeURIComponent(c))).join(ye(a));
    switch (a) {
      case "label":
        return `.${n}`;
      case "matrix":
        return `;${r}=${n}`;
      case "simple":
        return n;
      default:
        return `${r}=${n}`;
    }
  }
  const u = me(a), o = s.map((n) => a === "label" || a === "simple" ? t ? n : encodeURIComponent(n) : I({
    allowReserved: t,
    name: r,
    value: n
  })).join(u);
  return a === "label" || a === "matrix" ? u + o : o;
}, I = ({
  allowReserved: t,
  name: e,
  value: r
}) => {
  if (r == null)
    return "";
  if (typeof r == "object")
    throw new Error(
      "Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these."
    );
  return `${e}=${t ? r : encodeURIComponent(r)}`;
}, Q = ({
  allowReserved: t,
  explode: e,
  name: r,
  style: a,
  value: s,
  valueOnly: u
}) => {
  if (s instanceof Date)
    return u ? s.toISOString() : `${r}=${s.toISOString()}`;
  if (a !== "deepObject" && !e) {
    let c = [];
    Object.entries(s).forEach(([i, f]) => {
      c = [
        ...c,
        i,
        t ? f : encodeURIComponent(f)
      ];
    });
    const d = c.join(",");
    switch (a) {
      case "form":
        return `${r}=${d}`;
      case "label":
        return `.${d}`;
      case "matrix":
        return `;${r}=${d}`;
      default:
        return d;
    }
  }
  const o = be(a), n = Object.entries(s).map(
    ([c, d]) => I({
      allowReserved: t,
      name: a === "deepObject" ? `${r}[${c}]` : c,
      value: d
    })
  ).join(o);
  return a === "label" || a === "matrix" ? o + n : n;
}, ge = /\{[^{}]+\}/g, we = ({ path: t, url: e }) => {
  let r = e;
  const a = e.match(ge);
  if (a)
    for (const s of a) {
      let u = !1, o = s.substring(1, s.length - 1), n = "simple";
      o.endsWith("*") && (u = !0, o = o.substring(0, o.length - 1)), o.startsWith(".") ? (o = o.substring(1), n = "label") : o.startsWith(";") && (o = o.substring(1), n = "matrix");
      const c = t[o];
      if (c == null)
        continue;
      if (Array.isArray(c)) {
        r = r.replace(
          s,
          X({ explode: u, name: o, style: n, value: c })
        );
        continue;
      }
      if (typeof c == "object") {
        r = r.replace(
          s,
          Q({
            explode: u,
            name: o,
            style: n,
            value: c,
            valueOnly: !0
          })
        );
        continue;
      }
      if (n === "matrix") {
        r = r.replace(
          s,
          `;${I({
            name: o,
            value: c
          })}`
        );
        continue;
      }
      const d = encodeURIComponent(
        n === "label" ? `.${c}` : c
      );
      r = r.replace(s, d);
    }
  return r;
}, ve = ({
  baseUrl: t,
  path: e,
  query: r,
  querySerializer: a,
  url: s
}) => {
  const u = s.startsWith("/") ? s : `/${s}`;
  let o = (t ?? "") + u;
  e && (o = we({ path: e, url: o }));
  let n = r ? a(r) : "";
  return n.startsWith("?") && (n = n.substring(1)), n && (o += `?${n}`), o;
};
function xe(t) {
  const e = t.body !== void 0;
  if (e && t.bodySerializer)
    return "serializedBody" in t ? t.serializedBody !== void 0 && t.serializedBody !== "" ? t.serializedBody : null : t.body !== "" ? t.body : null;
  if (e)
    return t.body;
}
const Se = async (t, e) => {
  const r = typeof e == "function" ? await e(t) : e;
  if (r)
    return t.scheme === "bearer" ? `Bearer ${r}` : t.scheme === "basic" ? `Basic ${btoa(r)}` : r;
}, Y = ({
  allowReserved: t,
  array: e,
  object: r
} = {}) => (s) => {
  const u = [];
  if (s && typeof s == "object")
    for (const o in s) {
      const n = s[o];
      if (n != null)
        if (Array.isArray(n)) {
          const c = X({
            allowReserved: t,
            explode: !0,
            name: o,
            style: "form",
            value: n,
            ...e
          });
          c && u.push(c);
        } else if (typeof n == "object") {
          const c = Q({
            allowReserved: t,
            explode: !0,
            name: o,
            style: "deepObject",
            value: n,
            ...r
          });
          c && u.push(c);
        } else {
          const c = I({
            allowReserved: t,
            name: o,
            value: n
          });
          c && u.push(c);
        }
    }
  return u.join("&");
}, Ce = (t) => {
  if (!t)
    return "stream";
  const e = t.split(";")[0]?.trim();
  if (e) {
    if (e.startsWith("application/json") || e.endsWith("+json"))
      return "json";
    if (e === "multipart/form-data")
      return "formData";
    if (["application/", "audio/", "image/", "video/"].some(
      (r) => e.startsWith(r)
    ))
      return "blob";
    if (e.startsWith("text/"))
      return "text";
  }
}, Ee = (t, e) => e ? !!(t.headers.has(e) || t.query?.[e] || t.headers.get("Cookie")?.includes(`${e}=`)) : !1, _e = async ({
  security: t,
  ...e
}) => {
  for (const r of t) {
    if (Ee(e, r.name))
      continue;
    const a = await Se(r, e.auth);
    if (!a)
      continue;
    const s = r.name ?? "Authorization";
    switch (r.in) {
      case "query":
        e.query || (e.query = {}), e.query[s] = a;
        break;
      case "cookie":
        e.headers.append("Cookie", `${s}=${a}`);
        break;
      default:
        e.headers.set(s, a);
        break;
    }
  }
}, J = (t) => ve({
  baseUrl: t.baseUrl,
  path: t.path,
  query: t.query,
  querySerializer: typeof t.querySerializer == "function" ? t.querySerializer : Y(t.querySerializer),
  url: t.url
}), G = (t, e) => {
  const r = { ...t, ...e };
  return r.baseUrl?.endsWith("/") && (r.baseUrl = r.baseUrl.substring(0, r.baseUrl.length - 1)), r.headers = K(t.headers, e.headers), r;
}, Te = (t) => {
  const e = [];
  return t.forEach((r, a) => {
    e.push([a, r]);
  }), e;
}, K = (...t) => {
  const e = new Headers();
  for (const r of t) {
    if (!r)
      continue;
    const a = r instanceof Headers ? Te(r) : Object.entries(r);
    for (const [s, u] of a)
      if (u === null)
        e.delete(s);
      else if (Array.isArray(u))
        for (const o of u)
          e.append(s, o);
      else u !== void 0 && e.set(
        s,
        typeof u == "object" ? JSON.stringify(u) : u
      );
  }
  return e;
};
class A {
  constructor() {
    this.fns = [];
  }
  clear() {
    this.fns = [];
  }
  eject(e) {
    const r = this.getInterceptorIndex(e);
    this.fns[r] && (this.fns[r] = null);
  }
  exists(e) {
    const r = this.getInterceptorIndex(e);
    return !!this.fns[r];
  }
  getInterceptorIndex(e) {
    return typeof e == "number" ? this.fns[e] ? e : -1 : this.fns.indexOf(e);
  }
  update(e, r) {
    const a = this.getInterceptorIndex(e);
    return this.fns[a] ? (this.fns[a] = r, e) : !1;
  }
  use(e) {
    return this.fns.push(e), this.fns.length - 1;
  }
}
const je = () => ({
  error: new A(),
  request: new A(),
  response: new A()
}), ke = Y({
  allowReserved: !1,
  array: {
    explode: !0,
    style: "form"
  },
  object: {
    explode: !0,
    style: "deepObject"
  }
}), $e = {
  "Content-Type": "application/json"
}, Z = (t = {}) => ({
  ...he,
  headers: $e,
  parseAs: "auto",
  querySerializer: ke,
  ...t
}), ze = (t = {}) => {
  let e = G(Z(), t);
  const r = () => ({ ...e }), a = (d) => (e = G(e, d), r()), s = je(), u = async (d) => {
    const i = {
      ...e,
      ...d,
      fetch: d.fetch ?? e.fetch ?? globalThis.fetch,
      headers: K(e.headers, d.headers),
      serializedBody: void 0
    };
    i.security && await _e({
      ...i,
      security: i.security
    }), i.requestValidator && await i.requestValidator(i), i.body !== void 0 && i.bodySerializer && (i.serializedBody = i.bodySerializer(i.body)), (i.body === void 0 || i.serializedBody === "") && i.headers.delete("Content-Type");
    const f = J(i);
    return { opts: i, url: f };
  }, o = async (d) => {
    const { opts: i, url: f } = await u(d), E = {
      redirect: "follow",
      ...i,
      body: xe(i)
    };
    let w = new Request(f, E);
    for (const h of s.request.fns)
      h && (w = await h(w, i));
    const $ = i.fetch;
    let l = await $(w);
    for (const h of s.response.fns)
      h && (l = await h(l, w, i));
    const p = {
      request: w,
      response: l
    };
    if (l.ok) {
      const h = (i.parseAs === "auto" ? Ce(l.headers.get("Content-Type")) : i.parseAs) ?? "json";
      if (l.status === 204 || l.headers.get("Content-Length") === "0") {
        let g;
        switch (h) {
          case "arrayBuffer":
          case "blob":
          case "text":
            g = await l[h]();
            break;
          case "formData":
            g = new FormData();
            break;
          case "stream":
            g = l.body;
            break;
          default:
            g = {};
            break;
        }
        return i.responseStyle === "data" ? g : {
          data: g,
          ...p
        };
      }
      let m;
      switch (h) {
        case "arrayBuffer":
        case "blob":
        case "formData":
        case "json":
        case "text":
          m = await l[h]();
          break;
        case "stream":
          return i.responseStyle === "data" ? l.body : {
            data: l.body,
            ...p
          };
      }
      return h === "json" && (i.responseValidator && await i.responseValidator(m), i.responseTransformer && (m = await i.responseTransformer(m))), i.responseStyle === "data" ? m : {
        data: m,
        ...p
      };
    }
    const x = await l.text();
    let _;
    try {
      _ = JSON.parse(x);
    } catch {
    }
    const S = _ ?? x;
    let b = S;
    for (const h of s.error.fns)
      h && (b = await h(S, l, w, i));
    if (b = b || {}, i.throwOnError)
      throw b;
    return i.responseStyle === "data" ? void 0 : {
      error: b,
      ...p
    };
  }, n = (d) => (i) => o({ ...i, method: d }), c = (d) => async (i) => {
    const { opts: f, url: E } = await u(i);
    return pe({
      ...f,
      body: f.body,
      headers: f.headers,
      method: d,
      onRequest: async (w, $) => {
        let l = new Request(w, $);
        for (const p of s.request.fns)
          p && (l = await p(l, f));
        return l;
      },
      url: E
    });
  };
  return {
    buildUrl: J,
    connect: n("CONNECT"),
    delete: n("DELETE"),
    get: n("GET"),
    getConfig: r,
    head: n("HEAD"),
    interceptors: s,
    options: n("OPTIONS"),
    patch: n("PATCH"),
    post: n("POST"),
    put: n("PUT"),
    request: o,
    setConfig: a,
    sse: {
      connect: c("CONNECT"),
      delete: c("DELETE"),
      get: c("GET"),
      head: c("HEAD"),
      options: c("OPTIONS"),
      patch: c("PATCH"),
      post: c("POST"),
      put: c("PUT"),
      trace: c("TRACE")
    },
    trace: n("TRACE")
  };
}, Oe = (t) => ({
  ...t,
  ...fe.getConfig()
}), O = ze(Oe(Z({
  baseUrl: "https://localhost:44338"
})));
class q {
  static ping(e) {
    return (e?.client ?? O).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/aimediajanitor/api/v1/ping",
      ...e
    });
  }
  static whatsMyName(e) {
    return (e?.client ?? O).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/aimediajanitor/api/v1/whatsMyName",
      ...e
    });
  }
  static whatsTheTimeMrWolf(e) {
    return (e?.client ?? O).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/aimediajanitor/api/v1/whatsTheTimeMrWolf",
      ...e
    });
  }
  static whoAmI(e) {
    return (e?.client ?? O).get({
      security: [
        {
          scheme: "bearer",
          type: "http"
        }
      ],
      url: "/umbraco/aimediajanitor/api/v1/whoAmI",
      ...e
    });
  }
}
var Ue = Object.defineProperty, We = Object.getOwnPropertyDescriptor, ee = (t) => {
  throw TypeError(t);
}, k = (t, e, r, a) => {
  for (var s = a > 1 ? void 0 : a ? We(e, r) : e, u = t.length - 1, o; u >= 0; u--)
    (o = t[u]) && (s = (a ? o(e, r, s) : o(s)) || s);
  return a && s && Ue(e, r, s), s;
}, te = (t, e, r) => e.has(t) || ee("Cannot " + r), T = (t, e, r) => (te(t, e, "read from private field"), r ? r.call(t) : e.get(t)), U = (t, e, r) => e.has(t) ? ee("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, r), Ie = (t, e, r, a) => (te(t, e, "write to private field"), e.set(t, r), r), j, D, M, P;
let v = class extends ue(ne) {
  constructor() {
    super(), this._yourName = "Press the button!", U(this, j), U(this, D, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await q.whoAmI();
      if (a) {
        e.state = "failed", console.error(a);
        return;
      }
      r !== void 0 && (this._serverUserData = r, e.state = "success"), T(this, j) && T(this, j).peek("warning", {
        data: {
          headline: `You are ${this._serverUserData?.name}`,
          message: `Your email is ${this._serverUserData?.email}`
        }
      });
    }), U(this, M, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await q.whatsTheTimeMrWolf();
      if (a) {
        e.state = "failed", console.error(a);
        return;
      }
      r !== void 0 && (this._timeFromMrWolf = new Date(r), e.state = "success");
    }), U(this, P, async (t) => {
      const e = t.target;
      e.state = "waiting";
      const { data: r, error: a } = await q.whatsMyName();
      if (a) {
        e.state = "failed", console.error(a);
        return;
      }
      this._yourName = r, e.state = "success";
    }), this.consumeContext(le, (t) => {
      Ie(this, j, t);
    }), this.consumeContext(de, (t) => {
      this.observe(
        t?.currentUser,
        (e) => {
          this._contextCurrentUser = e;
        },
        "_contextCurrentUser"
      );
    });
  }
  render() {
    return V`
      <uui-box headline="Who am I?">
        <div slot="header">[Server]</div>
        <h2>
          <uui-icon name="icon-user"></uui-icon>${this._serverUserData?.email ? this._serverUserData.email : "Press the button!"}
        </h2>
        <ul>
          ${this._serverUserData?.groups.map(
      (t) => V`<li>${t.name}</li>`
    )}
        </ul>
        <uui-button
          color="default"
          look="primary"
          @click="${T(this, D)}"
        >
          Who am I?
        </uui-button>
        <p>
          This endpoint gets your current user from the server and displays your
          email and list of user groups. It also displays a Notification with
          your details.
        </p>
      </uui-box>

      <uui-box headline="What's my Name?">
        <div slot="header">[Server]</div>
        <h2><uui-icon name="icon-user"></uui-icon> ${this._yourName}</h2>
        <uui-button
          color="default"
          look="primary"
          @click="${T(this, P)}"
        >
          Whats my name?
        </uui-button>
        <p>
          This endpoint has a forced delay to show the button 'waiting' state
          for a few seconds before completing the request.
        </p>
      </uui-box>

      <uui-box headline="What's the Time?">
        <div slot="header">[Server]</div>
        <h2>
          <uui-icon name="icon-alarm-clock"></uui-icon> ${this._timeFromMrWolf ? this._timeFromMrWolf.toLocaleString() : "Press the button!"}
        </h2>
        <uui-button
          color="default"
          look="primary"
          @click="${T(this, M)}"
        >
          Whats the time Mr Wolf?
        </uui-button>
        <p>This endpoint gets the current date and time from the server.</p>
      </uui-box>

      <uui-box headline="Who am I?" class="wide">
        <div slot="header">[Context]</div>
        <p>Current user email: <b>${this._contextCurrentUser?.email}</b></p>
        <p>
          This is the JSON object available by consuming the
          'UMB_CURRENT_USER_CONTEXT' context:
        </p>
        <umb-code-block language="json" copy
          >${JSON.stringify(this._contextCurrentUser, null, 2)}</umb-code-block
        >
      </uui-box>
    `;
  }
};
j = /* @__PURE__ */ new WeakMap();
D = /* @__PURE__ */ new WeakMap();
M = /* @__PURE__ */ new WeakMap();
P = /* @__PURE__ */ new WeakMap();
v.styles = [
  oe`
      :host {
        display: grid;
        gap: var(--uui-size-layout-1);
        padding: var(--uui-size-layout-1);
        grid-template-columns: 1fr 1fr 1fr;
      }

      uui-box {
        margin-bottom: var(--uui-size-layout-1);
      }

      h2 {
        margin-top: 0;
      }

      .wide {
        grid-column: span 3;
      }
    `
];
k([
  W()
], v.prototype, "_yourName", 2);
k([
  W()
], v.prototype, "_timeFromMrWolf", 2);
k([
  W()
], v.prototype, "_serverUserData", 2);
k([
  W()
], v.prototype, "_contextCurrentUser", 2);
v = k([
  ce("example-dashboard")
], v);
const Pe = v;
export {
  v as ExampleDashboardElement,
  Pe as default
};
//# sourceMappingURL=dashboard.element-Cw_JiqJG.js.map
