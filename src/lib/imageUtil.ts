// Prepares a screenshot for the Scam Helper: shrinks it so it uploads quickly,
// and turns it into the base64 text the API expects. Browser only.

export type PreparedImage = {
  mimeType: "image/jpeg";
  data: string; // base64, without the "data:" prefix
  preview: string; // a data URL for showing a thumbnail
};

const MAX_SIDE = 1280; // longest side in pixels, plenty for reading a message

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not a picture.");
  if (file.size > 15 * 1024 * 1024) throw new Error("That picture is too big (over 15 MB).");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that picture.");

  // a white background, so screenshots with transparency stay readable
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const preview = canvas.toDataURL("image/jpeg", 0.82);
  return { mimeType: "image/jpeg", data: preview.split(",")[1], preview };
}
