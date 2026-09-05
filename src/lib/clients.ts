import type { Client, WorkItem } from "./types";

export function projectClientName(
  project: Pick<WorkItem, "clientId" | "client">,
  clients: readonly Client[]
) {
  return (
    (project.clientId
      ? clients.find((client) => client.id === project.clientId)?.name
      : undefined) ??
    project.client?.trim() ??
    ""
  );
}

function clientId(name: string) {
  return `client-${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "record"
  }`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function mergeClientRecords(
  existing: readonly Client[],
  legacyNames: readonly string[]
): Client[] {
  const clients = new Map(
    existing.map((client) => [
      client.name.trim().toLowerCase(),
      { ...client, name: client.name.trim() },
    ])
  );
  for (const value of legacyNames) {
    const name = value.trim();
    if (!name || clients.has(name.toLowerCase())) continue;
    clients.set(name.toLowerCase(), {
      id: clientId(name),
      name,
      company: "",
      contactName: "",
      email: "",
      phone: "",
      notes: "",
      archived: false,
    });
  }
  return [...clients.values()];
}

export function normalizeClientRecords(
  value: unknown,
  legacyNames: readonly string[] = []
): Client[] {
  const records = Array.isArray(value)
    ? value.flatMap((candidate): Client[] => {
        if (
          !isRecord(candidate) ||
          typeof candidate.name !== "string" ||
          !candidate.name.trim()
        )
          return [];
        const name = candidate.name.trim();
        return [
          {
            id:
              typeof candidate.id === "string" && candidate.id.trim()
                ? candidate.id.trim()
                : clientId(name),
            name,
            company:
              typeof candidate.company === "string"
                ? candidate.company.trim()
                : "",
            contactName:
              typeof candidate.contactName === "string"
                ? candidate.contactName.trim()
                : "",
            email:
              typeof candidate.email === "string" ? candidate.email.trim() : "",
            phone:
              typeof candidate.phone === "string" ? candidate.phone.trim() : "",
            notes: typeof candidate.notes === "string" ? candidate.notes : "",
            archived: candidate.archived === true,
          },
        ];
      })
    : [];
  return mergeClientRecords(records, legacyNames);
}
