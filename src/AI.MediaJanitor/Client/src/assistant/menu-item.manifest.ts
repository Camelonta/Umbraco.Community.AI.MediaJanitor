import {
  ASSISTANT_MENU_ITEM_ALIAS,
  ASSISTANT_ROUTE_PATH,
  UMB_MEDIA_MENU_ALIAS,
} from "./constants.js";

// Sidebar entry next to "Media" and "Recycle Bin" in the Media section.
// We use kind "link" pointing at the workspace route so clicking it opens the
// custom workspace view we register separately.
export const menuItemManifests: Array<UmbExtensionManifest> = [
  {
    type: "menuItem",
    kind: "link",
    alias: ASSISTANT_MENU_ITEM_ALIAS,
    name: "AI Media Assistant Menu Item",
    weight: 50, // place after the built-in Media tree (1000) / Recycle Bin (900)
    meta: {
      label: "AI Media Assistant",
      icon: "icon-wand",
      menus: [UMB_MEDIA_MENU_ALIAS],
      href: `/section/media/dashboard/${ASSISTANT_ROUTE_PATH}`,
    },
  },
];
