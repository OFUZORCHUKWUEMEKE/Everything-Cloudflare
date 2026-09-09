// Phase 2: ChatRoom with WebSocket
// Features: Store messages, add/remove users, get room state, real-time WebSocket

export interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

export interface RoomState {
  messageCount: number;
  users: string[];
  lastMessage: Message | null;
}

export interface WSMessage {
  type: "message" | "user-joined" | "user-left" | "state";
  data: any;
}

export class ChatRoom {
  state: DurableObjectState;
  messages: Message[] = [];
  users: Set<string> = new Set();
  connections: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.initialize();
  }

  // Load persisted state from storage
  async initialize() {
    const stored = await this.state.storage.get<Message[]>("messages");
    if (stored) {
      this.messages = stored;
    }
  }

  // Handle incoming requests from Worker
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // WebSocket upgrade
      if (pathname === "/ws" && request.method === "GET") {
        return this.handleWebSocket(request);
      }

      if (pathname === "/state" && request.method === "GET") {
        return this.handleGetState();
      }

      if (pathname === "/add-message" && request.method === "POST") {
        const body = await request.json() as { user: string; text: string };
        return this.handleAddMessage(body.user, body.text);
      }

      if (pathname === "/add-user" && request.method === "POST") {
        const body = await request.json() as { user: string };
        return this.handleAddUser(body.user);
      }

      if (pathname === "/remove-user" && request.method === "POST") {
        const body = await request.json() as { user: string };
        return this.handleRemoveUser(body.user);
      }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Durable Object error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
    }
  }

  // Handle WebSocket upgrade
  private handleWebSocket(request: Request): Response {
    const [client, server] = new WebSocketPair();

    this.connections.add(server);

    // Handle incoming messages from client
    server.addEventListener("message", async (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "message" && msg.user && msg.text) {
          const message = await this.addMessage(msg.user, msg.text);

          // Broadcast to all connected clients
          this.broadcast({
            type: "message",
            data: message,
          });
        }

        if (msg.type === "join" && msg.user) {
          this.addUser(msg.user);

          // Notify all clients
          this.broadcast({
            type: "user-joined",
            data: { user: msg.user, users: Array.from(this.users) },
          });
        }

        if (msg.type === "leave" && msg.user) {
          this.removeUser(msg.user);

          // Notify all clients
          this.broadcast({
            type: "user-left",
            data: { user: msg.user, users: Array.from(this.users) },
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        server.send(JSON.stringify({ type: "error", data: "Invalid message" }));
      }
    });

    // Handle client disconnect
    server.addEventListener("close", () => {
      this.connections.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  // Broadcast message to all connected clients
  private broadcast(message: WSMessage) {
    const payload = JSON.stringify(message);

    for (const client of this.connections) {
      try {
        client.send(payload);
      } catch (error) {
        console.error("Broadcast error:", error);
        this.connections.delete(client);
      }
    }
  }

  private handleGetState(): Response {
    const state = this.getState();
    return new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleAddMessage(user: string, text: string): Promise<Response> {
    const message = await this.addMessage(user, text);

    // Also broadcast via WebSocket
    this.broadcast({
      type: "message",
      data: message,
    });

    return new Response(JSON.stringify({ message }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleAddUser(user: string): Response {
    this.addUser(user);

    // Broadcast via WebSocket
    this.broadcast({
      type: "user-joined",
      data: { user, users: Array.from(this.users) },
    });

    return new Response(JSON.stringify({ message: "User added", users: Array.from(this.users) }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private handleRemoveUser(user: string): Response {
    this.removeUser(user);

    // Broadcast via WebSocket
    this.broadcast({
      type: "user-left",
      data: { user, users: Array.from(this.users) },
    });

    return new Response(JSON.stringify({ message: "User removed", users: Array.from(this.users) }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Add message to room
  private async addMessage(user: string, text: string): Promise<Message> {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      user,
      text,
      timestamp: Date.now(),
    };

    this.messages.push(message);

    // Keep only last 100 messages (prevent storage bloat)
    if (this.messages.length > 100) {
      this.messages.shift();
    }

    // Persist to storage
    await this.state.storage.put("messages", this.messages);

    return message;
  }

  // User joins room
  private addUser(user: string) {
    this.users.add(user);
  }

  // User leaves room
  private removeUser(user: string) {
    this.users.delete(user);
  }

  // Get room state (for dashboard/stats)
  private getState(): RoomState {
    return {
      messageCount: this.messages.length,
      users: Array.from(this.users),
      lastMessage: this.messages[this.messages.length - 1] || null,
    };
  }
}
