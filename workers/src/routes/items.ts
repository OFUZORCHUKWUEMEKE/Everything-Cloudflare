import { Hono } from "hono";
import type { Env, Item } from "../types";
import { getUserId } from "../middleware/auth";
import { generateId } from "../helpers/otp";
import { validateJson, ValidationError } from "../helpers/validate";
import { checkRateLimit } from "../helpers/rate-limit";
import { uploadImage, deleteImage } from "../helpers/r2";
import { getClientIP } from "../middleware/auth";
import { initializeSchema } from "../db";
import { createItemSchema, updateItemSchema } from "../schemas";

const items = new Hono<{ Bindings: Env }>();

// GET /items - List user's items
items.get("/", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const userItems = await c.env.DB.prepare(
      "SELECT id, user_id, title, description, created_at FROM items WHERE user_id = ? ORDER BY created_at DESC"
    ).bind(userId).all() as any;

    return c.json({ items: userItems?.results || [] });
  } catch (error: any) {
    console.error("Query error:", error);
    return c.json({ error: "Failed to fetch items" }, 500);
  }
});

// POST /items - Create item
items.post("/", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const ip = getClientIP(c);
  const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, ip, "/items");
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  try {
    const { title, description } = await validateJson(c, createItemSchema);

    const itemId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      "INSERT INTO items (id, user_id, title, description, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(itemId, userId, title, description || "", now).run();

    const item: Item = {
      id: itemId,
      user_id: userId,
      title,
      description: description || "",
      created_at: now,
    };

    return c.json({ message: "Item created", item }, 201);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Insert error:", error);
    return c.json({ error: "Failed to create item" }, 500);
  }
});

// GET /items/:id - Get single item
items.get("/:id", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const item = await c.env.DB.prepare(
      "SELECT id, user_id, title, description, created_at FROM items WHERE id = ?"
    ).bind(c.req.param("id")).first() as any;

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (item.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json({ item });
  } catch (error: any) {
    console.error("Query error:", error);
    return c.json({ error: "Failed to fetch item" }, 500);
  }
});

// PUT /items/:id - Update item
items.put("/:id", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const data = await validateJson(c, updateItemSchema);

    const item = await c.env.DB.prepare(
      "SELECT id, user_id, title, description FROM items WHERE id = ?"
    ).bind(c.req.param("id")).first() as any;

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (item.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const title = data.title ?? item.title;
    const description = data.description ?? item.description;

    await c.env.DB.prepare(
      "UPDATE items SET title = ?, description = ? WHERE id = ?"
    ).bind(title, description, c.req.param("id")).run();

    const updated = await c.env.DB.prepare(
      "SELECT id, user_id, title, description, created_at FROM items WHERE id = ?"
    ).bind(c.req.param("id")).first();

    return c.json({ message: "Item updated", item: updated });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Update error:", error);
    return c.json({ error: "Failed to update item" }, 500);
  }
});

// DELETE /items/:id - Delete item
items.delete("/:id", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const item = await c.env.DB.prepare(
      "SELECT user_id FROM items WHERE id = ?"
    ).bind(c.req.param("id")).first() as any;

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (item.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await c.env.DB.prepare("DELETE FROM items WHERE id = ?").bind(c.req.param("id")).run();

    return c.json({ message: "Item deleted" });
  } catch (error: any) {
    console.error("Delete error:", error);
    return c.json({ error: "Failed to delete item" }, 500);
  }
});

// POST /items/:id/image - Upload item image
items.post("/:id/image", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const itemId = c.req.param("id");

    // Verify item exists and belongs to user
    const item = await c.env.DB.prepare(
      "SELECT user_id FROM items WHERE id = ?"
    ).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (item.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Get file from request
    const contentType = c.req.header("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return c.json({ error: "Content-Type must be an image" }, 400);
    }

    const buffer = await c.req.arrayBuffer();

    // Validate
    if (buffer.byteLength === 0) {
      return c.json({ error: "Image is empty" }, 400);
    }

    if (buffer.byteLength > 10 * 1024 * 1024) {
      return c.json({ error: "Image too large (max 10MB)" }, 400);
    }

    // Upload to R2
    const result = await uploadImage(c.env.R2_BUCKET, itemId, buffer, contentType);

    if (!result) {
      return c.json({ error: "Failed to upload image" }, 500);
    }

    return c.json({
      message: "Image uploaded successfully",
      imageUrl: result.url,
      key: result.key,
    }, 201);
  } catch (error: any) {
    console.error("Image upload error:", error);
    return c.json({ error: error.message || "Failed to upload image" }, 500);
  }
});

// DELETE /items/:id/image - Delete item image
items.delete("/:id/image", async (c) => {
  await initializeSchema(c.env.DB);

  const userId = await getUserId(c);
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const itemId = c.req.param("id");
    const imageKey = c.req.query("key"); // Pass R2 key as query param

    if (!imageKey) {
      return c.json({ error: "Image key required" }, 400);
    }

    // Verify item exists and belongs to user
    const item = await c.env.DB.prepare(
      "SELECT user_id FROM items WHERE id = ?"
    ).bind(itemId).first() as any;

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    if (item.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Delete from R2
    await deleteImage(c.env.R2_BUCKET, imageKey);

    return c.json({ message: "Image deleted successfully" });
  } catch (error: any) {
    console.error("Image delete error:", error);
    return c.json({ error: error.message || "Failed to delete image" }, 500);
  }
});

export default items;
