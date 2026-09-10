# Party Docs - Collaborative Document Editor

Real-time collaborative document editor built with Cloudflare Durable Objects, Hono, and React.

## ✨ Features

- **Real-Time Collaboration**: Multiple users editing the same document simultaneously
- **Live Presence**: See who's online and their cursor positions
- **Persistent Storage**: Documents are saved across sessions
- **Conflict Resolution**: Handles concurrent edits gracefully
- **Word & Character Count**: Real-time stats as you type
- **User Names**: Customizable user names with color indicators

## 🏗️ Architecture

```
Browser (React 18)
    ↓
Vite Dev Server (port 5173)
    ├─ Proxies /api → Worker (port 8787)
    └─ Proxies WebSocket → Worker
    
Worker (Hono + Cloudflare Workers)
    ↓
Durable Object (DocumentRoom)
    ├─ In-memory state
    ├─ WebSocket connections
    ├─ Persistent storage (DurableObjectStorage)
    └─ Message broadcasting
```

## 📂 Project Structure

```
src/
├── index.ts                 # Hono Worker handler
├── document-room.ts         # Durable Object for document state
├── main.tsx                 # React entry point
├── App.tsx                  # Main app component
├── index.css                # Global styles
├── hooks/
│   └── useEditor.ts        # Custom WebSocket hook
└── components/
    ├── Editor.tsx          # Text editor with collaborative cursors
    └── Presence.tsx        # Active users sidebar
```

## 🚀 Development

### Install Dependencies

```bash
cd party-docs
npm install --legacy-peer-deps
```

### Run Both Servers

**Terminal 1: Worker (Durable Objects)**
```bash
npm run dev
# Runs on http://localhost:8787
```

**Terminal 2: React Dev Server**
```bash
npm run dev:react
# Runs on http://localhost:5173
# Auto-proxies /api to Worker
```

### Access the App

Open http://localhost:5173 in your browser

1. Enter your name in the modal
2. Start typing to create/edit the document
3. Open another browser tab to see real-time collaboration

## 📝 How It Works

### Document State Management

The `DocumentRoom` Durable Object maintains:
- **content**: The current document text
- **users**: Map of connected users with their cursor positions
- **version**: Document version number (incremented on each change)

### Real-Time Sync

1. **Client sends edit**: `{type: 'edit', position, content, length}`
2. **Server receives**: DocumentRoom processes the edit
3. **Update stored**: Changes persisted to DurableObjectStorage
4. **Broadcast**: All connected clients receive the update
5. **UI updates**: React components reflect the new state

### WebSocket Messages

```typescript
// Edit message
{type: 'edit', position: 0, content: 'hello', length: 0}

// Cursor position
{type: 'cursor', cursor: 5}

// Sync on connect
{type: 'sync', fullContent: '...', version: 1, users: [...]}

// User join/leave
{type: 'join', userId: '...', userName: 'Alice'}
{type: 'leave', userId: '...'}
```

## 🎨 Collaborative Cursors

Each user has a unique color. Their cursor position is displayed with:
- A blinking cursor line
- Their name label above
- Real-time updates as they type

## 💾 Persistence

Documents are persisted using `DurableObjectStorage`:
- Content stored in key: `content`
- Version number stored in key: `version`
- Survives Durable Object evictions
- Survives Cloudflare deployment

## 🧪 Testing Collaboration

1. Open http://localhost:5173 in browser window A
2. Enter name "Alice" and start typing
3. Open http://localhost:5173 in browser window B
4. Enter name "Bob"
5. Both clients see:
   - Real-time updates as either person types
   - Cursor positions for both users
   - User list with color indicators

## 📊 Stats Footer

Shows live statistics:
- **Words**: Count of space-separated words
- **Characters**: Total character count (excluding whitespace)

## 🔧 Configuration

Edit [wrangler.toml](wrangler.toml) to:
- Change document binding name
- Configure Durable Object classes
- Add custom domains

## 🚀 Production Deployment

### Build for Production

```bash
# Build Worker
npm run build

# Build React app
npm run build:react
# Output: dist-react/
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
# Deploys to your Cloudflare account
```

### Deploy Frontend to Cloudflare Pages

1. Build the React app: `npm run build:react`
2. Push `dist-react/` to GitHub
3. Connect GitHub repo to Cloudflare Pages
4. Configure build settings:
   - Build command: `npm run build:react`
   - Build output directory: `dist-react`

## 🐛 Troubleshooting

### WebSocket Connection Fails
- Ensure Worker is running (`npm run dev` in terminal 1)
- Check that port 8787 is not blocked
- Verify proxy configuration in `vite.config.ts`

### Changes Not Syncing
- Check browser console for errors
- Verify both dev servers are running
- Restart both servers and refresh browser

### Lost Content
- Documents are persisted in DurableObjectStorage
- Check storage via Cloudflare dashboard in production

## 📚 Learn More

- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Hono Framework](https://hono.dev)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🎯 Future Enhancements

- [ ] Rich text editor (WYSIWYG)
- [ ] Version history / undo-redo
- [ ] Collaborative cursors with names visible in editor
- [ ] Comments and annotations
- [ ] Export to PDF/Markdown
- [ ] Share links with permissions
- [ ] Real-time presence avatars
- [ ] Code syntax highlighting
- [ ] Collaborative cursors using CRDT

## 📄 License

MIT
