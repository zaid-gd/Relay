"use node";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type UploadSessionResult = {
  sessionId: Id<"r2UploadSessions">;
  reservationId: Id<"workspaceStorageReservations">;
  key: string;
  url: string;
  expiresAt: number;
};

type UploadSession = {
  _id: Id<"r2UploadSessions">;
  projectId: string;
  projectFileId?: Id<"projectFiles">;
  key: string;
  uploaderUserId: string;
  status: "pending" | "completed";
  createdAt: string;
  expiresAt: number;
};

type R2DownloadTarget = {
  key: string;
  fileName: string;
  mimeType: string;
};

function r2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION ?? "auto";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET."
    );
  }
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function client() {
  const config = r2Config();
  return {
    config,
    s3: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

export const createUploadUrl = action({
  args: {
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args): Promise<UploadSessionResult> => {
    const { config, s3 } = client();
    const session: Omit<UploadSessionResult, "url"> = await ctx.runMutation(
      internal.projectFiles.createR2UploadSession,
      {
        projectId: args.projectId,
        projectFileId: args.projectFileId,
        fileName: args.fileName,
        size: args.size,
      }
    );
    const { sessionId, reservationId, key, expiresAt } = session;
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: args.mimeType || "application/octet-stream",
      }),
      { expiresIn: 15 * 60 }
    );
    return { sessionId, reservationId, key, url, expiresAt };
  },
});

export const completeUpload = action({
  args: {
    sessionId: v.id("r2UploadSessions"),
    reservationId: v.id("workspaceStorageReservations"),
    projectId: v.string(),
    projectFileId: v.optional(v.id("projectFiles")),
    category: v.union(
      v.literal("Deliverable"),
      v.literal("Reference"),
      v.literal("Asset")
    ),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent_to_client"),
      v.literal("changes_requested"),
      v.literal("approved"),
      v.literal("final_delivered")
    ),
    clientVisible: v.boolean(),
    downloadable: v.boolean(),
    fileName: v.string(),
    mimeType: v.string(),
    notes: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"projectFiles">> => {
    const session: UploadSession | null = await ctx.runQuery(
      internal.projectFiles.getR2UploadSession,
      {
        sessionId: args.sessionId,
      }
    );
    if (!session || session.projectId !== args.projectId)
      throw new Error("R2 upload session not found");
    const { config, s3 } = client();
    let metadata;
    try {
      metadata = await s3.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: session.key })
      );
    } catch {
      throw new Error("R2 upload was not found. Try uploading the file again.");
    }
    return await ctx.runMutation(internal.projectFiles.finalizeR2Upload, {
      sessionId: args.sessionId,
      reservationId: args.reservationId,
      projectId: args.projectId,
      projectFileId: args.projectFileId,
      category: args.category,
      title: args.title,
      description: args.description,
      status: args.status,
      clientVisible: args.clientVisible,
      downloadable: args.downloadable,
      fileName: args.fileName,
      mimeType:
        args.mimeType || metadata.ContentType || "application/octet-stream",
      size: metadata.ContentLength ?? 0,
      notes: args.notes,
    });
  },
});

export const createDownloadUrl = action({
  args: { versionId: v.id("projectFileVersions") },
  handler: async (ctx, args): Promise<string> => {
    const target: R2DownloadTarget | null = await ctx.runQuery(
      internal.projectFiles.getR2DownloadTarget,
      args
    );
    if (!target) throw new Error("R2 file not found");
    const { config, s3 } = client();
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: target.key,
        ResponseContentType: target.mimeType,
        ResponseContentDisposition: `inline; filename="${target.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")}"`,
      }),
      { expiresIn: 15 * 60 }
    );
  },
});

export const createPortalDownloadUrl = action({
  args: {
    token: v.string(),
    versionId: v.id("projectFileVersions"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const target: R2DownloadTarget | null = await ctx.runQuery(
      internal.clientPortals.getPublicR2DownloadTarget,
      args
    );
    if (!target) throw new Error("This file is no longer available");
    const { config, s3 } = client();
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: target.key,
        ResponseContentType: target.mimeType,
        ResponseContentDisposition: `inline; filename="${target.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")}"`,
      }),
      { expiresIn: 15 * 60 }
    );
  },
});

export const deleteObject = internalAction({
  args: { key: v.string() },
  handler: async (_ctx, args): Promise<null> => {
    const { config, s3 } = client();
    await s3.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: args.key })
    );
    return null;
  },
});
