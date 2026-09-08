import { Hono } from "hono";
import { ChatRoom } from "./chat-room";
import { z } from "zod";

// Environment types
interface Env {
  CHAT_ROOM: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Validation schemas
const messageSchema = z.object({
  user: z.string().min(1, "User required"),
  text: z.string().min(1, "Message required").max(500, "Message too long"),
});

const userSchema = z.object({
  user: z.string().min(1, "User required"),
});

type MessageInput = z.infer<typeof messageSchema>;
type UserInput = z.infer<typeof userSchema>;

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Get room state (messages, users, stats)
app.get("/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");

  try {
    // Get Durable Object instance
    const id = c.env.CHAT_ROOM.idFromName(roomId);
    const stub = c.env.CHAT_ROOM.get(id);

    // Call the Durable Object
    const response = await stub.fetch("https://chat/state");
    const data = await response.json();

    return c.json(data);
  } catch (error) {
    console.error("Error getting room state:", error);
    return c.json({ error: "Failed to get room state" }, 500);
  }
});

// Add message to room
app.post("/rooms/:roomId/messages", async (c) => {
  const roomId = c.req.param("roomId");

  try {
    const body = await c.req.json() as unknown;
    const { user, text } = messageSchema.parse(body);

    const id = c.env.CHAT_ROOM.idFromName(roomId);
    const stub = c.env.CHAT_ROOM.get(id);

    const response = await stub.fetch("https://chat/add-message", {
      method: "POST",
      body: JSON.stringify({ user, text }),
    });

    const data = await response.json();
    return c.json(data, { status: response.status as any });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: error.errors }, 400);
    }
    console.error("Error adding message:", error);
    return c.json({ error: "Failed to add message" }, 500);
  }
});

// User joins room
app.post("/rooms/:roomId/users", async (c) => {
  const roomId = c.req.param("roomId");

  try {
    const body = await c.req.json() as unknown;
    const { user } = userSchema.parse(body);

    const id = c.env.CHAT_ROOM.idFromName(roomId);
    const stub = c.env.CHAT_ROOM.get(id);

    const response = await stub.fetch("https://chat/add-user", {
      method: "POST",
      body: JSON.stringify({ user }),
    });

    const data = await response.json();
    return c.json(data);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: error.errors }, 400);
    }
    console.error("Error adding user:", error);
    return c.json({ error: "Failed to add user" }, 500);
  }
});

// User leaves room
app.delete("/rooms/:roomId/users/:user", async (c) => {
  const roomId = c.req.param("roomId");
  const user = c.req.param("user");

  try {
    const id = c.env.CHAT_ROOM.idFromName(roomId);
    const stub = c.env.CHAT_ROOM.get(id);

    const response = await stub.fetch("https://chat/remove-user", {
      method: "POST",
      body: JSON.stringify({ user }),
    });

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Error removing user:", error);
    return c.json({ error: "Failed to remove user" }, 500);
  }
});

// Export the Durable Object class
export { ChatRoom };

// Export the worker
export default app;
