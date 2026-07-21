import { menuItemManifests } from "./menu-item.manifest.js";
import { dashboardManifests } from "./dashboard.manifest.js";

export const manifests: Array<UmbExtensionManifest> = [
  ...menuItemManifests,
  ...dashboardManifests,
];
