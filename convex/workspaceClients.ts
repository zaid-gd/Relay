import { v, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const clientValidator = v.object({
  id: v.string(),
  name: v.string(),
  company: v.string(),
  contactName: v.string(),
  email: v.string(),
  phone: v.string(),
  notes: v.string(),
  archived: v.boolean(),
});
type Client = Infer<typeof clientValidator>;

export async function getWorkspaceClient(
  ctx: QueryCtx | MutationCtx,
  ownerUserId: string,
  id: string
) {
  const record = await ctx.db
    .query("clients")
    .withIndex("by_ownerUserId_and_id", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("id", id)
    )
    .unique();
  if (record) return record;
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_userId", (q) => q.eq("userId", ownerUserId))
    .unique();
  return settings?.clients?.find((client) => client.id === id) ?? null;
}

// Existing arrays remain readable until their records are saved in the clients table.
export async function readWorkspaceClients(
  ctx: QueryCtx | MutationCtx,
  ownerUserId: string,
  legacy: Client[] = []
) {
  const records = await ctx.db
    .query("clients")
    .withIndex("by_ownerUserId_and_id", (q) => q.eq("ownerUserId", ownerUserId))
    .take(8193);
  if (records.length > 8192)
    throw new Error("Client directory exceeds the supported workspace size");
  const clients = new Map(legacy.map((client) => [client.id, client]));
  for (const { _id, _creationTime, ownerUserId: owner, ...client } of records) {
    clients.set(client.id, client);
  }
  return [...clients.values()];
}

export async function saveWorkspaceClient(
  ctx: MutationCtx,
  ownerUserId: string,
  client: Client
) {
  if (!client.id.trim() || !client.name.trim())
    throw new Error("Client id and name are required");
  const stored = await ctx.db
    .query("clients")
    .withIndex("by_ownerUserId_and_id", (q) =>
      q.eq("ownerUserId", ownerUserId).eq("id", client.id)
    )
    .unique();
  if (stored) await ctx.db.patch(stored._id, client);
  else await ctx.db.insert("clients", { ...client, ownerUserId });
}
