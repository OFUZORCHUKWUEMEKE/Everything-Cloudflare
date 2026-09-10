# Party Docs - Real-Time Collaborative Document Editor

🎉 A modern, production-ready collaborative document editor built with **Cloudflare Durable Objects**, **Hono**, and **React 18**. Experience Google Docs-like collaboration powered by edge computing.

## ✨ Features

- **Real-Time Collaboration** 🔄 Multiple users editing the same document simultaneously
- **Live Presence** 👥 See who's online with color-coded cursors and names
- **Persistent Storage** 💾 Documents survive Durable Object evictions and deployments
- **Operational Transform** ⚡ Handles concurrent edits gracefully without conflicts
- **Modern UI** 🎨 Beautiful, polished interface with animations and transitions
- **Word/Character/Line Stats** 📊 Real-time document statistics
- **Cursor Tracking** 🎯 See exactly where other users are typing
- **User Presence** 🟢 Visual indicators showing active users and their activity

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React 18)                   │
│  ┌──────────────┬────────────────┬──────────────────┐   │
│  │  App.tsx     │  Editor.tsx    │  Presence.tsx    │   │
│  │  (State)     │  (Text Editor) │  (User List)     │   │
│  └──────────────┴────────────────┴──────────────────┘   │
│         ↕ WebSocket (real-time messaging)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  useEditor Hook                                 │   │
│  │  - Manages WebSocket connection                 │   │
│  │  - Handles incoming/outgoing messages           │   │
│  │  - Callbacks to parent components               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↕ Vite Dev Server (port 5173)
                            Proxies /api to Worker
                            
┌─────────────────────────────────────────────────────────┐
│            Cloudflare Worker (Hono Framework)           │
│                      (port 8787)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routes:                                         │  │
│  │  GET /              → Serve HTML                 │  │
│  │  GET /api/docs/:id/ws  → WebSocket upgrade     │  │
│  │  GET /api/docs/:id/sync → Sync endpoint        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│         Durable Object (DocumentRoom)                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  State Management:                               │  │
│  │  • content: string (document text)               │  │
│  │  • users: Map<userId, UserPresence>             │  │
│  │  • version: number (for conflict resolution)     │  │
│  │  • clients: Map<userId, WebSocket>              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Message Handlers:                               │  │
│  │  • handleWebSocket() → Accept WS connection     │  │
│  │  • handleEdit() → Apply text changes            │  │
│  │  • handleCursor() → Track cursor positions      │  │
│  │  • broadcast() → Send to all clients            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Persistence:                                    │  │
│  │  • DurableObjectStorage (survives evictions)    │  │
│  │  • Automatic content saving on edits            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Real-Time Collaboration Flow

### How Edits Work

```
User A Types "hello"
    ↓
onChange event fires
    ↓
calculateChange() determines: position=0, content='hello', length=0
    ↓
sendEdit() called via useEditor hook
    ↓
WebSocket sends: {type: 'edit', position: 0, content: 'hello', length: 0}
    ↓
═════════════════════════════════════════════════════════
    ↓
SERVER (DocumentRoom)
    ↓
handleEdit() receives message
    ↓
Updates: this.doc.content = '' + 'hello' + '' = 'hello'
    ↓
Increments version: this.doc.version++
    ↓
Saves to storage: this.state.storage.put('content', 'hello')
    ↓
Broadcasts to ALL clients: {type: 'edit', userId: 'alice', position: 0, ...}
    ↓
═════════════════════════════════════════════════════════
    ↓
User A Receives Message
    ↓
onmessage fires → case 'edit'
    ↓
setContent('hello') updates React state
    ↓
Editor re-renders showing "hello"
    ↓
═════════════════════════════════════════════════════════
    ↓
User B Receives Message
    ↓
onmessage fires → case 'edit'
    ↓
Applies: before + 'hello' + after = 'hello'
    ↓
setContent('hello') updates React state
    ↓
Editor re-renders → User B sees Alice's text instantly ✨
```

### How Cursor Tracking Works

```
User A Presses Arrow Key
    ↓
onKeyUp fires → cursor moves to position 5
    ↓
onCursorChange(5) called
    ↓
sendCursor(5) via useEditor
    ↓
WebSocket sends: {type: 'cursor', cursor: 5}
    ↓
═════════════════════════════════════════════════════════
    ↓
SERVER (DocumentRoom)
    ↓
handleCursor() receives message
    ↓
Updates: user.cursor = 5
    ↓
Broadcasts: {type: 'cursor', userId: 'alice', cursor: 5}
    ↓
═════════════════════════════════════════════════════════
    ↓
User B Receives Message
    ↓
onmessage fires → case 'cursor'
    ↓
onCursor callback fires with (userId: 'alice', cursor: 5)
    ↓
setUsers updates Alice's cursor position
    ↓
Component re-renders
    ↓
Alice's cursor moves to position 5 on Bob's screen ✨
```

## 📚 Core Concepts Explained

### Callbacks (Design Pattern)

**What**: Functions passed as parameters to give control to the caller.

```typescript
// useEditor doesn't manage users - it tells App.tsx about events
useEditor(docId, userName, {
  onJoin: (userId, name) => {
    // App.tsx decides what to do with this data
    setUsers(prev => [...prev, {userId, name, cursor: 0, color: '#999'}])
  },
  onCursor: (userId, cursor) => {
    // App.tsx updates UI however it wants
    setUsers(prev =>
      prev.map(u => u.userId === userId ? {...u, cursor} : u)
    )
  }
})
```

**Why**: Separation of concerns - WebSocket logic stays in `useEditor`, UI state management stays in `App.tsx`.

### useCallback (React Hook)

**What**: Memoizes functions so they return the SAME object on every render.

```typescript
const sendEdit = useCallback((text, position, length) => {
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({
      type: 'edit',
      position,
      content: text,
      length,
    }))
  }
}, [])  // Empty array = never recreate
```

**Why**: Prevents unnecessary re-renders of `Editor.tsx` when the `onChange` prop doesn't change.

**Without useCallback**:
- Every render: `sendEdit = new Function object #1234`
- React thinks: "onChange prop changed!"
- Editor re-renders unnecessarily ❌

**With useCallback**:
- Every render: `sendEdit = same Function object #1234`
- React thinks: "onChange prop is the same"
- Editor doesn't re-render ✅

### Dependency Arrays

Controls WHEN to recreate functions/effects:

```typescript
// Empty array = Never recreate (function stays forever)
const sendEdit = useCallback((...) => {...}, [])

// With dependencies = Recreate when dependencies change
const sendData = useCallback(
  (...) => {...},
  [docId]  // Recreate only when docId changes
)

// No array = Always recreate (defeats optimization)
const sendData = useCallback((...) => {...})
```

### Request Object (`c.req.raw`)

Contains all HTTP request information needed for WebSocket upgrade:

```typescript
c.req.raw.headers        // HTTP headers (includes Upgrade, Sec-WebSocket-Key, etc.)
c.req.raw.method         // 'GET'
c.req.raw.url            // Full URL
c.req.raw.body           // Request body (empty for WebSocket)
```

**Why needed**: Durable Object needs EXACT request with all headers intact for WebSocket handshake.

### useRef vs useState

```typescript
// useState = triggers re-render when changed
const [content, setContent] = useState('')  // ✓ Use for UI state
const [users, setUsers] = useState([])      // ✓ Use for UI state

// useRef = doesn't trigger re-render
const wsRef = useRef(null)  // ✓ Use for WebSocket (needs to persist)
                            // ❌ Don't use for content (wouldn't update UI)
```

## 🚀 Development Setup

### Prerequisites

```bash
Node.js 16+
npm or yarn
```

### Installation

```bash
cd party-docs
npm install --legacy-peer-deps
```

### Run Both Servers

**Terminal 1: Start Worker (Durable Objects)**
```bash
npm run dev
# Runs on http://localhost:8787
```

**Terminal 2: Start React Dev Server**
```bash
npm run dev:react
# Runs on http://localhost:5173
# Proxies /api to Worker automatically
```

### Access the App

Open http://localhost:5173 in your browser

1. Enter your name in the modal
2. Start typing to create/edit document
3. Open another browser tab with same URL
4. See real-time collaboration! ✨

## 📂 Project Structure

```
src/
├── index.ts
│   └── Hono Worker handler
│       ├── GET / → Serve HTML
│       ├── GET /api/docs/:docId/ws → WebSocket upgrade
│       └── GET /api/docs/:docId/sync → Get document state
│
├── document-room.ts
│   └── DocumentRoom Durable Object
│       ├── State: content, users, version, clients
│       ├── handleWebSocket() → Accept connections
│       ├── handleEdit() → Apply text changes
│       ├── handleCursor() → Track cursor positions
│       ├── broadcast() → Send to all clients
│       └── Persistent storage via DurableObjectStorage
│
├── App.tsx
│   └── Main React component
│       ├── State: docId, userName, users, status
│       ├── useEditor hook for WebSocket
│       ├── Callbacks: onSync, onJoin, onLeave, onCursor
│       ├── User modal for name entry
│       └── Layout: Header + Editor + Presence sidebar
│
├── hooks/useEditor.ts
│   └── Custom React hook for WebSocket management
│       ├── WebSocket connection setup
│       ├── Message parsing (sync, edit, join, leave, cursor)
│       ├── sendEdit() → Send text changes
│       ├── sendCursor() → Send cursor position
│       └── Callbacks for events
│
├── components/Editor.tsx
│   └── Text editor with collaborative features
│       ├── Textarea for text input
│       ├── Line numbers on left
│       ├── Collaborative cursors overlay (other users)
│       ├── Stats footer (words, characters, lines)
│       └── Change detection and message sending
│
├── components/Presence.tsx
│   └── Active users sidebar
│       ├── User list with color indicators
│       ├── Cursor position tracking
│       └── Connection status
│
└── index.css
    └── Global styles with animations and theme
```

## 💬 Message Types

### Client → Server

```typescript
// When user types/deletes
{
  type: 'edit',
  position: number,    // Where change happened
  content: string,     // Text inserted
  length: number       // Characters deleted (0 if insert)
}

// When user moves cursor
{
  type: 'cursor',
  cursor: number       // Character position
}
```

### Server → Client

```typescript
// When new user connects (full sync)
{
  type: 'sync',
  version: number,
  fullContent: string,
  users: UserPresence[]
}

// When text is edited
{
  type: 'edit',
  userId: string,
  position: number,
  content: string,
  length: number,
  version: number
}

// When user joins
{
  type: 'join',
  userId: string,
  userName: string
}

// When user leaves
{
  type: 'leave',
  userId: string
}

// When cursor moves
{
  type: 'cursor',
  userId: string,
  cursor: number
}
```

## 🎨 Modern UI Features

### Visual Design
- **Gradient Header**: Purple gradient (667eea → 764ba2)
- **Glass Morphism**: Backdrop blur effects
- **Smooth Animations**: Transitions and keyframe animations
- **Color-Coded Users**: Each user has a unique color
- **Custom Scrollbars**: Styled for better aesthetics

### Editor Features
- **Line Numbers**: Auto-updating based on content
- **Real-Time Stats**: Word count, character count, line count
- **Collaborative Cursors**: Blinking cursors with names
- **User Avatars**: Color circles showing active users

### Presence Sidebar
- **Live Status**: Shows "Just you" or active users
- **Cursor Tracking**: See where others are typing
- **Hover Effects**: Interactive card design
- **Better Spacing**: Modern, clean layout

## 📊 Performance Optimizations

### useCallback Usage
```typescript
// sendEdit and sendCursor use useCallback with empty deps
// Prevents unnecessary Editor.tsx re-renders
const sendEdit = useCallback((...) => {...}, [])
const sendCursor = useCallback((...) => {...}, [])
```

**Impact**: Editor component doesn't re-render on every parent update

### WebSocket Refs
```typescript
// Use useRef for WebSocket, not useState
const wsRef = useRef<WebSocket | null>(null)
// Prevents connection from being recreated on re-renders
```

**Impact**: Single persistent connection throughout component lifetime

### Message Batching
Server broadcasts edits immediately (no batching)
Cursor updates are sent on every key press/click

---

## 🐛 Troubleshooting

### WebSocket Connection Fails
- ✅ Ensure Worker is running (`npm run dev`)
- ✅ Check that port 8787 is not blocked
- ✅ Verify Vite proxy config in `vite.config.ts`
- ✅ Check browser console for errors

### Changes Not Syncing
- ✅ Check browser console for WebSocket errors
- ✅ Verify both dev servers are running
- ✅ Restart both servers if needed
- ✅ Refresh browser and re-enter name

### Stale Messages
- ✅ Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- ✅ Restart both dev servers
- ✅ Check browser's Application → Local Storage

### Connection Shows "Connecting..."
- ✅ Worker must be running on port 8787
- ✅ Check network tab for failed WebSocket upgrade
- ✅ Verify firewall allows localhost connections

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
# Deploys your Worker to Cloudflare
```

### Deploy Frontend to Cloudflare Pages

1. Build React app: `npm run build:react`
2. Push `dist-react/` to GitHub
3. Connect GitHub repo to Cloudflare Pages
4. Configure:
   - Build command: `npm run build:react`
   - Build output directory: `dist-react`

## 🎓 Learning Resources

### Concepts Used
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Hooks](https://react.dev/reference/react)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Operational Transform](https://en.wikipedia.org/wiki/Operational_transformation)

### Related Projects
- [Google Docs](https://docs.google.com) - Inspiration
- [Figma](https://figma.com) - Real-time collaboration reference
- [Notion](https://notion.so) - Rich editor reference

## 🔮 Future Enhancements

- [ ] **Rich Text Editor** - WYSIWYG editing with formatting
- [ ] **Version History** - Track changes and revert
- [ ] **Comments** - Inline comments and discussions
- [ ] **Real-time Typing Indicators** - Show when others are typing
- [ ] **Export Formats** - PDF, Markdown, Word
- [ ] **Share Links** - Public/private sharing with permissions
- [ ] **Code Syntax Highlighting** - For code blocks
- [ ] **Collaborative Bookmarks** - Save and share positions
- [ ] **Undo/Redo** - Per-user undo history
- [ ] **@ Mentions** - Notify other users
- [ ] **Dark Mode** - Theme switcher
- [ ] **Mobile App** - React Native version
- [ ] **Multi-Document Support** - Workspace with multiple docs
- [ ] **Search/Replace** - Find and replace functionality
- [ ] **Auto-Save** - Background continuous saving

## 📄 License

MIT

---

## 🙏 Acknowledgments

Built with:
- ⚡ Cloudflare Workers & Durable Objects
- ⚛️ React 18
- 🎬 Vite
- 🚂 Hono Framework
- 💻 TypeScript

---

## 📞 Support

For issues, questions, or feature requests:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the [Architecture](#-architecture) diagram
3. Examine the code comments in `src/`
4. Check browser console for errors

---

**Happy collaborating! 🎉**

*Built with ❤️ using Cloudflare's edge computing platform*
