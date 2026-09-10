# Chat Room - Durable Objects Learning Project

Real-time chat application using Cloudflare Durable Objects.

## Architecture

**Durable Objects** = Room state (messages, users)
**Workers** = API endpoints + WebSocket proxy
**Frontend** = React/HTML UI (Phase 3)

## Project Phases

### Phase 1: Basic ChatRoom ✅
- [x] Durable Object class structure
- [x] Message storage (100 message limit)
- [x] User tracking (add/remove)
- [x] REST API endpoints

**REST API Endpoints:**
```bash
# Get room state
GET /rooms/:roomId

# Add message (REST)
POST /rooms/:roomId/messages
{ "user": "Alice", "text": "Hello!" }

# User joins (REST)
POST /rooms/:roomId/users
{ "user": "Bob" }

# User leaves (REST)
DELETE /rooms/:roomId/users/:user
```

### Phase 2: WebSocket Support ✅ (Current)
- [x] WebSocket proxy in Worker
- [x] Real-time message broadcast
- [x] User presence updates (join/leave)
- [x] Connection management
- [x] HTML test client

**WebSocket Endpoint:**
```bash
# Connect to room
ws://localhost:8787/rooms/:roomId/ws

# Messages over WebSocket
{ "type": "message", "user": "Alice", "text": "Hello!" }
{ "type": "join", "user": "Bob" }
{ "type": "leave", "user": "Bob" }
```

**Real-time Events:**
- `message` - New message in room
- `user-joined` - User connected
- `user-left` - User disconnected

### Phase 3: Frontend UI ✅ (Current)
- [x] Beautiful, modern HTML/CSS interface
- [x] Multi-room support with room switching
- [x] Real-time chat interface
- [x] User presence indicators (online count)
- [x] Active users list (modal)
- [x] Send/receive messages in real-time
- [x] System messages (join/leave notifications)
- [x] Responsive mobile-friendly design
- [x] Clean animations and transitions
- [x] Dark-mode ready CSS variables

### Phase 4: Advanced Features (Optional)
- [ ] Room persistence settings
- [ ] Message history pagination
- [ ] User typing indicators
- [ ] Reactions/emojis
- [ ] File sharing
- [ ] Rate limiting per room

## Getting Started

```bash
# Install dependencies
npm install

# Development (starts on http://localhost:8787)
npm run dev
```

**Then open in browser:**
- Production UI: `file:///path/to/index.html` (or serve via HTTP)
- Test Client (Phase 2): `file:///path/to/test-client.html`

## Testing

### Phase 1: REST API (curl)
```bash
# Get room state
curl http://localhost:8788/rooms/general

# Add message
curl http://localhost:8788/rooms/general/messages \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user":"Alice","text":"Hello!"}'

# User join
curl http://localhost:8788/rooms/general/users \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user":"Bob"}'
```

### Phase 2: WebSocket (Real-time)
1. Open `test-client.html` in browser
2. Enter room name and your name
3. Click "Connect"
4. Open same test client in another tab with different name
5. Send messages - see them broadcast in real-time!

### Phase 3: Production UI
1. Open `index.html` in browser (file:// or serve via wrangler)
2. Enter a room name (e.g., "general", "random", "tech")
3. Enter your name
4. Click "Join Room"
5. Open index.html in multiple tabs/windows with different names
6. Send messages - see real-time updates across all clients!

**Features to try:**
- Switch between rooms (sidebar)
- View active users (👥 button)
- See user join/leave notifications
- Send multi-line messages (Shift+Enter)
- Open on mobile to see responsive design

## Key Concepts to Learn

1. **Durable Objects** - Persistent state + execution
2. **Storage API** - Key-value persistence
3. **Durable Object Namespaces** - Getting/creating instances
4. **Request routing** - How Workers call Durable Objects
5. **WebSockets** - Real-time communication (Phase 2)

## Learnings

- Durable Objects are like serverless databases with compute
- Each instance has isolated state
- IDs uniquely identify instances
- Storage persists between invocations
- Great for stateful services (chat, counters, rate limiters)

## UI Features (Phase 3)

### Welcome Screen
- Room name input
- User name input
- Join button

### Chat Interface
- **Sidebar**: Room list, user profile, logout
- **Chat Area**: Messages with timestamps, user names
- **Users Modal**: See who's online in the room
- **Input**: Message input with send button

### Visual Design
- Modern gradient background
- Smooth animations
- Color-coded messages (own vs others)
- System messages for user events
- Online status indicator
- Responsive grid/flexbox layout
- Accessible color scheme (WCAG AA)

## Architecture Summary

```
Browser (UI)
    ↓
WebSocket Connection
    ↓
Worker (Hono Router)
    ↓
Durable Object Instance
    ├─ In-memory state (messages, users, connections)
    └─ Persistent storage (messages only)
```

**Technology Stack:**
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Hono + Cloudflare Workers
- Real-time: WebSockets + Durable Objects
- Storage: Cloudflare Workers KV (future)
