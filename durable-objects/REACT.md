# CloudChat - Vite React Version

Modern React implementation of the real-time chat application using Vite.

## Features

✨ **React 18 with Hooks**
- Functional components with `useState`, `useEffect`
- Custom `useWebSocket` hook for WebSocket management
- Clean component composition

📦 **Vite**
- Lightning-fast HMR (Hot Module Replacement)
- Optimized production builds
- TypeScript support out of the box

🎯 **Component Structure**
```
src/
├── App.tsx              # Main app component (state management)
├── App.css              # Shared styles
├── main.tsx             # React entry point
├── hooks/
│   └── useWebSocket.ts  # Custom WebSocket hook
└── components/
    ├── WelcomeScreen.tsx
    ├── ChatScreen.tsx
    ├── ChatHeader.tsx
    ├── MessageList.tsx
    ├── MessageInput.tsx
    ├── Sidebar.tsx
    └── UserModal.tsx
```

## Development

### Run Worker + React Dev Server

**Terminal 1: Start the Worker (handles WebSocket)**
```bash
npm run dev
# Runs on http://localhost:8787
```

**Terminal 2: Start Vite React App**
```bash
npm run dev:react
# Runs on http://localhost:5173
# Proxies /rooms/* to Worker
```

The React app will automatically proxy WebSocket connections to the Worker running on port 8787.

## Build

### Build for Production

```bash
# Build Worker
npm run build

# Build React app
npm run build:react
# Output: dist-react/
```

### Preview Production Build

```bash
npm run preview
```

## Architecture

```
Browser (React App on 5173)
    ↓
WebSocket Connection (proxied to 8787)
    ↓
Worker (Hono on 8787)
    ↓
Durable Object
    ├─ In-memory state (messages, users)
    └─ Persistent storage
```

## Key Improvements from Vanilla JS

### 1. **Custom WebSocket Hook**
```typescript
const { send, close, isConnected } = useWebSocket({
  url: wsUrl,
  onMessage: handleMessage,
  onOpen: () => send({ type: 'join', user: currentUser }),
});
```

### 2. **Component Props**
```typescript
<ChatScreen
  currentRoom={currentRoom}
  messages={messages}
  users={users}
  onMessage={handleMessage}
  onSendMessage={handleSendMessage}
/>
```

### 3. **State Management with Hooks**
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [users, setUsers] = useState<string[]>([]);

const handleMessage = useCallback((msg: any) => {
  if (msg.type === 'message') {
    setMessages(prev => [...prev, msg.data]);
  }
}, []);
```

### 4. **Auto-scroll with useRef**
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

### 5. **Performance with useCallback**
```typescript
const handleSendMessage = useCallback((text: string) => {
  if (text.trim() && isConnected) {
    send({ type: 'message', user: currentUser, text });
  }
}, [send, isConnected, currentUser]);
```

## File Organization

- **Components are single-responsibility**: Each handles one UI concern
- **Hooks encapsulate logic**: WebSocket management isolated in custom hook
- **Props-based data flow**: Clear parent-child communication
- **TypeScript types**: Full type safety throughout

## Next Steps

### Optional Enhancements

1. **State Management Library**
   - Zustand for global state
   - Jotai for atomic state

2. **Styling**
   - Tailwind CSS for utility-first styling
   - CSS Modules for scoped styles

3. **Testing**
   - Vitest for unit tests
   - React Testing Library for component tests

4. **UI Components**
   - Radix UI for accessible primitives
   - shadcn/ui for pre-built components

5. **Performance**
   - React Query for server state
   - Memo for component optimization

## Differences from Vanilla Version

| Aspect | Vanilla | React |
|--------|---------|-------|
| **Size** | Single file | Multiple components |
| **State Management** | Object + manual updates | Hooks + automatic re-renders |
| **HMR** | None (refresh page) | Vite HMR (instant updates) |
| **Type Safety** | JSDoc | Full TypeScript |
| **Maintainability** | Harder as code grows | Scales with components |
| **Dev Experience** | Good | Excellent (Vite) |

## Deployment

### Deploy React App to Cloudflare Pages

```bash
npm run build:react
# Push dist-react/ to GitHub
# Connect GitHub repo to Cloudflare Pages
```

### Deploy Worker

```bash
npm run deploy
# Deploys to Cloudflare Workers
```

## Troubleshooting

### WebSocket Connection Fails
- Ensure Worker is running (`npm run dev`)
- Check proxy configuration in `vite.config.ts`
- Verify CORS headers are correct

### HMR Not Working
- Check if Vite server is running
- Ensure port 5173 is not blocked

### Stale Messages
- Clear browser cache
- Restart both dev servers

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Hono Documentation](https://hono.dev)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects)
