import {
  ASSISTANT_ROUTE_PATH,
  ASSISTANT_WORKSPACE_ALIAS,
  UMB_MEDIA_SECTION_ALIAS,
} from "./constants.js";

// Dashboard registered inside the Media section. Reachable via URL
//   /section/media/dashboard/<pathname>
// which is what the sidebar menu item links to.
export const dashboardManifests: Array<UmbExtensionManifest> = [
  {
    type: "dashboard",
    alias: ASSISTANT_WORKSPACE_ALIAS,
    name: "AI Media Assistant Dashboard",
    js: () => import("./workspace.element.js"),
    weight: 100,
    meta: {
      label: "AI Media Assistant",
      pathname: ASSISTANT_ROUTE_PATH,
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: UMB_MEDIA_SECTION_ALIAS,
      },
    ],
  },
];
