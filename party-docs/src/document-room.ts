export interface DocumentState {
  content: string;
  users: Map<string, UserPresence>;
  version: number;
  lastModified: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  cursor: number;
  color: string;
  lastActive: number;
}

export interface DocumentMessage {
  type: 'join' | 'leave' | 'edit' | 'cursor' | 'sync';
  userId: string;
  userName?: string;
  content?: string;
  position?: number;
  length?: number;
  cursor?: number;
  version?: number;
  fullContent?: string;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export class DocumentRoom {
  state: DurableObjectState;
  env: any;
  doc: DocumentState;
  clients: Map<string, WebSocket>;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.doc = {
      content: '',
      users: new Map(),
      version: 0,
      lastModified: Date.now(),
    };
    this.clients = new Map();
  }

  async initialize() {
    const stored = await this.state.storage?.get<string>('content');
    if (stored) {
      this.doc.content = stored;
    }

    const version = await this.state.storage?.get<number>('version');
    if (version !== undefined) {
      this.doc.version = version;
    }
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || `user-${Date.now()}`;
    const userName = url.searchParams.get('userName') || `Guest ${userId.slice(-4)}`;

    const [client, server] = new WebSocketPair();

    server.accept();

    const handleMessage = (event: MessageEvent) => {
      const message: DocumentMessage = JSON.parse(event.data);
      this.processMessage(message, userId, server);
    };

    const handleClose = () => {
      this.handleUserLeave(userId);
      this.clients.delete(userId);
    };

    server.addEventListener('message', handleMessage);
    server.addEventListener('close', handleClose);
    server.addEventListener('error', handleClose);

    this.clients.set(userId, server);

    // Add user presence
    this.doc.users.set(userId, {
      userId,
      name: userName,
      cursor: 0,
      color: COLORS[this.doc.users.size % COLORS.length],
      lastActive: Date.now(),
    });

    // Send sync message to new client
    const syncMessage: DocumentMessage = {
      type: 'sync',
      userId,
      version: this.doc.version,
      fullContent: this.doc.content,
    };
    server.send(JSON.stringify(syncMessage));

    // Notify others of new user
    this.broadcast({
      type: 'join',
      userId,
      userName,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private processMessage(message: DocumentMessage, userId: string, socket: WebSocket) {
    switch (message.type) {
      case 'edit':
        this.handleEdit(message, userId);
        break;
      case 'cursor':
        this.handleCursor(message, userId);
        break;
    }
  }

  private handleEdit(message: DocumentMessage, userId: string) {
    const { position = 0, content = '', length = 0 } = message;

    // Apply change: delete 'length' chars at position, insert 'content'
    const before = this.doc.content.slice(0, position);
    const after = this.doc.content.slice(position + length);
    this.doc.content = before + content + after;

    this.doc.version++;
    this.doc.lastModified = Date.now();

    // Save to persistent storage
    this.state.storage?.put('content', this.doc.content);
    this.state.storage?.put('version', this.doc.version);

    // Broadcast to all clients
    this.broadcast({
      type: 'edit',
      userId,
      position,
      content,
      length,
      version: this.doc.version,
    });
  }

  private handleCursor(message: DocumentMessage, userId: string) {
    const user = this.doc.users.get(userId);
    if (user && message.cursor !== undefined) {
      user.cursor = message.cursor;
      user.lastActive = Date.now();

      this.broadcast({
        type: 'cursor',
        userId,
        cursor: message.cursor,
      });
    }
  }

  private handleUserLeave(userId: string) {
    this.doc.users.delete(userId);

    this.broadcast({
      type: 'leave',
      userId,
    });
  }

  private broadcast(message: DocumentMessage) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      try {
        client.send(data);
      } catch (e) {
        // Client might be closed
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request);
    }

    if (url.pathname === '/api/sync') {
      return Response.json({
        content: this.doc.content,
        version: this.doc.version,
        users: Array.from(this.doc.users.values()),
      });
    }

    return new Response('Not found', { status: 404 });
  }
}
