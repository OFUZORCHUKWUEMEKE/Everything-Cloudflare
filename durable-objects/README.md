# Chat Room - Durable Objects Learning Project

Real-time chat application using Cloudflare Durable Objects.

## Architecture

**Durable Objects** = Room state (messages, users)
**Workers** = API endpoints + WebSocket proxy
**Frontend** = React/HTML UI (Phase 3)

## Project Phases

### Phase 1: Basic ChatRoom ✅ (Current)
- [x] Durable Object class structure
- [x] Message storage (100 message limit)
- [x] User tracking (add/remove)
- [x] REST API endpoints
- [ ] Test with curl

**API Endpoints:**
```bash
# Get room state
GET /rooms/:roomId

# Add message
POST /rooms/:roomId/messages
{ "user": "Alice", "text": "Hello!" }

# User joins
POST /rooms/:roomId/users
{ "user": "Bob" }

# User leaves
DELETE /rooms/:roomId/users/:user
```

### Phase 2: WebSocket Support (Next)
- [ ] WebSocket proxy in Worker
- [ ] Real-time message broadcast
- [ ] User presence updates
- [ ] Connection management

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

# Test endpoints with curl
curl http://localhost:8787/rooms/general/messages \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"user":"Alice","text":"Hello!"}'
```

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
