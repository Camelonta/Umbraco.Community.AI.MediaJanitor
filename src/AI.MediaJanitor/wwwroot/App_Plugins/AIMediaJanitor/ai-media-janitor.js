const a = [
  {
    name: "AIMedia Janitor Entrypoint",
    alias: "AI.MediaJanitor.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint-BSlTz4-p.js")
  }
], t = [
  {
    name: "AIMedia Janitor Dashboard",
    alias: "AI.MediaJanitor.Dashboard",
    type: "dashboard",
    js: () => import("./dashboard.element-Cw_JiqJG.js"),
    meta: {
      label: "Example Dashboard",
      pathname: "example-dashboard"
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Content"
      }
    ]
  }
], i = [
  ...a,
  ...t
];
export {
  i as manifests
};
//# sourceMappingURL=ai-media-janitor.js.map
