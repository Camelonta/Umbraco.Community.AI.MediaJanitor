const s = "AI.MediaJanitor.Workspace.Assistant", t = "AI.MediaJanitor.MenuItem.Assistant", a = "ai-media-assistant", n = "Umb.Menu.Media", i = "Umb.Section.Media", e = [
  {
    type: "menuItem",
    kind: "link",
    alias: t,
    name: "AI Media Assistant Menu Item",
    weight: 50,
    // place after the built-in Media tree (1000) / Recycle Bin (900)
    meta: {
      label: "AI Media Assistant",
      icon: "icon-wand",
      menus: [n],
      href: `/section/media/dashboard/${a}`
    }
  }
], A = [
  {
    type: "dashboard",
    alias: s,
    name: "AI Media Assistant Dashboard",
    js: () => import("./workspace.element-BtnqBC5-.js"),
    weight: 100,
    meta: {
      label: "AI Media Assistant",
      pathname: a
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: i
      }
    ]
  }
], o = [
  ...e,
  ...A
], d = [
  ...o
];
export {
  d as manifests
};
//# sourceMappingURL=ai-media-janitor.js.map
