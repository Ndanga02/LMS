import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import { env } from "./env";

const ACCOUNT_ID = env.R2_ACCOUNT_ID;
const ACCESS_KEY = env.R2_ACCESS_KEY_ID;
const SECRET_KEY = env.R2_SECRET_ACCESS_KEY;
const BUCKET = env.R2_BUCKET_NAME || "lms-files";

function getClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    requestHandler: new FetchHttpHandler(),
  });
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string,
): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getFileUrl(key: string): Promise<string> {
  const publicUrl = env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${key}`;
  return `/api/v1/files/${key}`;
}

export async function getFileStream(key: string) {
  const client = getClient();
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return result;
  } catch (error) {
    if (error instanceof NoSuchKey) return null;
    throw error;
  }
}

export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

export async function listFiles(prefix: string): Promise<string[]> {
  const client = getClient();
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    }),
  );
  return (result.Contents ?? []).map((o) => o.Key ?? "").filter(Boolean);
}

export function sanitizeKey(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\.+/g, "")
    .replace(/^\.+/g, "");
}
