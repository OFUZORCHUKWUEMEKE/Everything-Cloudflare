const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadImage(
  bucket: R2Bucket,
  itemId: string,
  file: ArrayBuffer,
  contentType: string
): Promise<{ url: string; key: string } | null> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Invalid image type. Allowed: JPEG, PNG, WebP, GIF");
  }

  // Validate file size
  if (file.byteLength > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Max size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
  }

  try {
    // Generate unique key: items/{itemId}/{timestamp}-{random}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const key = `items/${itemId}/${timestamp}-${random}`;

    // Upload to R2
    await bucket.put(key, file, {
      httpMetadata: {
        contentType,
        cacheControl: "max-age=31536000", // 1 year (immutable)
      },
    });

    return {
      key,
      url: `https://cdn.example.com/${key}`, // Replace with your R2 domain
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    throw new Error("Failed to upload image");
  }
}

export async function deleteImage(bucket: R2Bucket, key: string): Promise<void> {
  try {
    await bucket.delete(key);
    console.log(`Deleted image: ${key}`);
  } catch (error) {
    console.error("R2 delete error:", error);
    throw new Error("Failed to delete image");
  }
}

export function getImageUrl(key: string): string {
  return `https://cdn.example.com/${key}`; // Replace with your R2 domain
}
