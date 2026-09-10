import { useState, useEffect } from 'react'
import Editor from './components/Editor'
import Presence from './components/Presence'
import { useEditor } from './hooks/useEditor'

interface UserPresence {
  userId: string;
  name: string;
  cursor: number;
  color: string;
}

export default function App() {
  const [docId, setDocId] = useState('main')
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('userName')
    return saved || `Guest-${Math.random().toString(36).slice(2, 8)}`
  })
  const [showUserModal, setShowUserModal] = useState(!localStorage.getItem('userName'))
  const [users, setUsers] = useState<UserPresence[]>([])
  const [status, setStatus] = useState('connecting')

  const { content, cursor, sendEdit, sendCursor, connected } = useEditor(
    docId,
    userName,
    {
      onSync: (state: any) => {
        setUsers(state.users || [])
      },
      onJoin: (userId: string, name: string) => {
        setUsers(prev => {
          const existing = prev.find(u => u.userId === userId)
          if (existing) return prev
          return [...prev, { userId, name, cursor: 0, color: '#999' }]
        })
      },
      onLeave: (userId: string) => {
        setUsers(prev => prev.filter(u => u.userId !== userId))
      },
      onCursor: (userId: string, cursor: number) => {
        setUsers(prev =>
          prev.map(u => (u.userId === userId ? { ...u, cursor } : u))
        )
      },
    }
  )

  useEffect(() => {
    setStatus(connected ? 'connected' : 'connecting')
  }, [connected])

  const handleSetUserName = (name: string) => {
    setUserName(name)
    localStorage.setItem('userName', name)
    setShowUserModal(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#fafafa' }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            📄 Party Docs
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            Doc: <code>{docId}</code> • {status === 'connected' ? '✓ Connected' : '⏳ Connecting...'}
          </p>
        </div>
        <button
          onClick={() => setShowUserModal(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {userName}
        </button>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Editor
            content={content}
            cursor={cursor}
            users={users}
            onChange={(text, pos, len) => sendEdit(text, pos, len)}
            onCursorChange={(pos) => sendCursor(pos)}
          />
        </div>

        {/* Presence Sidebar */}
        <Presence users={users} />
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '300px',
          }}>
            <h2 style={{ margin: '0 0 16px 0' }}>Enter your name</h2>
            <input
              type="text"
              defaultValue={userName}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSetUserName((e.target as HTMLInputElement).value)
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement
                handleSetUserName(input.value)
              }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Join
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
