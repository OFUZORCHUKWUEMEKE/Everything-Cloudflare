import { Agent, routeAgentRequest } from "agents";

interface Env {
  IntakeAgent: DurableObjectNamespace;
}

type Message = {
  channel: "email" | "telegram" | "slack";
  from: string;
  body: string;
  at: string;
};

type IntakeAgentState = {
  clientId: string | null;
  messages: Message[];
};

export class IntakeAgent extends Agent<Env, IntakeAgentState> {
  async onStart() {
    // Initialize state if empty; state starts as undefined
    const initialState: IntakeAgentState = {
      clientId: null,
      messages: [],
    };
    await this.setState(initialState);

    // Set up SQLite table for persistent message history
    // this.ctx.storage.sql survives full Durable Object evictions
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS message_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel TEXT NOT NULL,
        from_addr TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  private async recordMessage(
    channel: "email" | "telegram" | "slack",
    from: string,
    body: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Persist to SQL (survives hibernation/eviction)
    await this.ctx.storage.sql.exec(
      `
        INSERT INTO message_history (channel, from_addr, body, created_at)
        VALUES (?, ?, ?, ?)
      `,
      [channel, from, body, now]
    );

    // Also add to in-memory state for fast access in this session
    const updated: IntakeAgentState = {
      ...this.state,
      messages: [
        ...this.state.messages,
        {
          channel,
          from,
          body,
          at: now,
        },
      ],
    };
    await this.setState(updated);
  }

  async onRequest(request: Request): Promise<Response> {
    // Health check endpoint
    if (request.method === "GET" && new URL(request.url).pathname.endsWith("/health")) {
      return Response.json({
        status: "alive",
        clientId: this.state.clientId,
        messageCount: this.state.messages.length,
      });
    }

    return new Response("Not found", { status: 404 });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
