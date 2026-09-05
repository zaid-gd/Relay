/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clientHub from "../clientHub.js";
import type * as clientPortals from "../clientPortals.js";
import type * as domainValidators from "../domainValidators.js";
import type * as http from "../http.js";
import type * as mediaVersionComments from "../mediaVersionComments.js";
import type * as migrations from "../migrations.js";
import type * as projectAccess from "../projectAccess.js";
import type * as projectActivity from "../projectActivity.js";
import type * as projectFiles from "../projectFiles.js";
import type * as projectGroups from "../projectGroups.js";
import type * as projectOutputs from "../projectOutputs.js";
import type * as projectPortals from "../projectPortals.js";
import type * as projects from "../projects.js";
import type * as publicProfiles from "../publicProfiles.js";
import type * as r2 from "../r2.js";
import type * as resourceLinks from "../resourceLinks.js";
import type * as salaryPlans from "../salaryPlans.js";
import type * as settings from "../settings.js";
import type * as team from "../team.js";
import type * as waitlist from "../waitlist.js";
import type * as workspaceClients from "../workspaceClients.js";
import type * as workspaceDiscovery from "../workspaceDiscovery.js";
import type * as workspaceSubscriptionProvisioning from "../workspaceSubscriptionProvisioning.js";
import type * as workspaceSubscriptions from "../workspaceSubscriptions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clientHub: typeof clientHub;
  clientPortals: typeof clientPortals;
  domainValidators: typeof domainValidators;
  http: typeof http;
  mediaVersionComments: typeof mediaVersionComments;
  migrations: typeof migrations;
  projectAccess: typeof projectAccess;
  projectActivity: typeof projectActivity;
  projectFiles: typeof projectFiles;
  projectGroups: typeof projectGroups;
  projectOutputs: typeof projectOutputs;
  projectPortals: typeof projectPortals;
  projects: typeof projects;
  publicProfiles: typeof publicProfiles;
  r2: typeof r2;
  resourceLinks: typeof resourceLinks;
  salaryPlans: typeof salaryPlans;
  settings: typeof settings;
  team: typeof team;
  waitlist: typeof waitlist;
  workspaceClients: typeof workspaceClients;
  workspaceDiscovery: typeof workspaceDiscovery;
  workspaceSubscriptionProvisioning: typeof workspaceSubscriptionProvisioning;
  workspaceSubscriptions: typeof workspaceSubscriptions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
