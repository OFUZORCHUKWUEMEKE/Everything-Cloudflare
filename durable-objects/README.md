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

### Phase 3: Frontend UI (After)
- [ ] HTML/CSS interface
- [ ] List active rooms
- [ ] Chat interface
- [ ] User presence indicator
- [ ] Send/receive messages in real-time

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

# Development
npm run dev

# Open test client
open test-client.html
```

## Testing

### Phase 1: REST API (curl)
```bash
# Get room state
curl http://localhost:8787/rooms/general

# Add message
curl http://localhost:8787/rooms/general/messages \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user":"Alice","text":"Hello!"}'

# User join
curl http://localhost:8787/rooms/general/users \
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

## Next: Test Phase 1
After confirming Phase 1 works, we'll add WebSocket support in Phase 2!
