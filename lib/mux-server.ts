import Mux from "@mux/mux-node";
import { env } from "./env";

export const mux = env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET
  ? new Mux({
      tokenId: env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
    })
  : null;

export async function createMuxDirectUploadUrl() {
  if (!mux) {
    throw new Error("Mux not configured (set MUX_TOKEN_ID and MUX_TOKEN_SECRET)");
  }

  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ["public"],
    },
    cors_origin: "*",
  });

  return {
    uploadUrl: upload.url,
    uploadId: upload.id,
  };
}

export async function getMuxAssetPlaybackId(uploadId: string) {
  if (!mux) throw new Error("Mux not configured");

  const upload = await mux.video.uploads.retrieve(uploadId);
  if (!upload.asset_id) return null;

  const asset = await mux.video.assets.retrieve(upload.asset_id);
  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) return null;

  return { playbackId, assetId: upload.asset_id };
}
