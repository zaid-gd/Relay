export const integrationServices = [
  { id: "googleDrive", name: "Google Drive", shortName: "Drive", description: "Project folders, briefs, exports, and shared deliverables.", color: "var(--brand-google-drive)", icon: "G" },
  { id: "frameIo", name: "Frame.io", shortName: "Frame", description: "Review links, client comments, and approval pages.", color: "var(--brand-frame-io)", icon: "F" },
  { id: "dropbox", name: "Dropbox", shortName: "Dropbox", description: "Shared file folders and delivery packages.", color: "var(--brand-dropbox)", icon: "D" },
  { id: "oneDrive", name: "OneDrive", shortName: "OneDrive", description: "Microsoft cloud folders and client handoff links.", color: "var(--brand-one-drive)", icon: "O" },
  { id: "googleCalendar", name: "Google Calendar", shortName: "Calendar", description: "Delivery schedules, review calls, and deadline calendars.", color: "var(--brand-google-calendar)", icon: "C" },
  { id: "slack", name: "Slack", shortName: "Slack", description: "Workspace, channel, and project discussion links.", color: "var(--brand-slack)", icon: "S" }
] as const;

export type IntegrationServiceId = (typeof integrationServices)[number]["id"];

export type IntegrationLink = {
  url: string;
  label: string;
  notes: string;
  updatedAt: string;
};

export type IntegrationLinks = Partial<Record<IntegrationServiceId, IntegrationLink>>;

export const emptyIntegrationLink: IntegrationLink = {
  url: "",
  label: "",
  notes: "",
  updatedAt: ""
};

/**
 * Creates an empty integration links object.
 */
export function emptyIntegrationLinks(): IntegrationLinks {
  return {};
}

/**
 * Finds an integration service by its ID.
 */
export function integrationServiceById(id: string) {
  return integrationServices.find((service) => service.id === id);
}

/**
 * Gets the display name of an integration service by ID.
 */
export function integrationServiceName(id: string) {
  return integrationServiceById(id)?.name ?? id;
}

/**
 * Type guard to check if a string is a valid integration service ID.
 */
export function isIntegrationServiceId(value: string): value is IntegrationServiceId {
  return integrationServices.some((service) => service.id === value);
}

/**
 * Normalizes a URL by trimming whitespace.
 */
export function normalizeUrl(value: string) {
  return value.trim();
}

/**
 * Validates whether a string is a valid HTTP or HTTPS URL.
 */
export function isValidIntegrationUrl(value: string) {
  const trimmed = normalizeUrl(value);
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasProperty<Key extends PropertyKey>(value: object, key: Key): value is Record<Key, unknown> {
  return key in value;
}

function readProperty(value: object, key: string): unknown {
  return hasProperty(value, key) ? value[key] : undefined;
}

/**
 * Normalizes an integration link from unknown input data.
 */
export function normalizeIntegrationLink(value: unknown): IntegrationLink {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...emptyIntegrationLink };
  const url = readProperty(value, "url");
  const label = readProperty(value, "label");
  const notes = readProperty(value, "notes");
  const updatedAt = readProperty(value, "updatedAt");
  return {
    url: typeof url === "string" ? normalizeUrl(url) : "",
    label: typeof label === "string" ? label.trim() : "",
    notes: typeof notes === "string" ? notes.trim() : "",
    updatedAt: typeof updatedAt === "string" ? updatedAt : ""
  };
}

/**
 * Normalizes integration links for all services from unknown input data.
 */
export function normalizeIntegrationLinks(value: unknown): IntegrationLinks {
  const links: IntegrationLinks = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return links;
  for (const service of integrationServices) {
    const link = normalizeIntegrationLink(readProperty(value, service.id));
    if (link.url || link.label || link.notes) {
      links[service.id] = link;
    }
  }
  return links;
}

/**
 * Checks if an integration link has a valid URL configured.
 */
export function hasIntegrationLink(link: IntegrationLink | undefined) {
  return Boolean(link?.url && isValidIntegrationUrl(link.url));
}

/**
 * Counts the number of configured integration links.
 */
export function configuredIntegrationCount(links: IntegrationLinks | undefined) {
  if (!links) return 0;
  return integrationServices.filter((service) => hasIntegrationLink(links[service.id])).length;
}

/**
 * Returns a status label for an integration link.
 */
export function integrationStatusLabel(link: IntegrationLink | undefined) {
  return hasIntegrationLink(link) ? "Link saved" : "No link";
}

/**
 * Returns the display text for an integration link, using label, URL, or fallback in that order.
 */
export function integrationDisplayText(link: IntegrationLink | undefined, fallback: string) {
  if (!link) return fallback;
  return link.label || link.url || fallback;
}
