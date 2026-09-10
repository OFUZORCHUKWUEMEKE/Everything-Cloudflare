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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✨ Party Docs
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Real-time collaborative editing • Doc: <code style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>{docId}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            color: 'white',
            fontSize: '13px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: status === 'connected' ? '#4caf50' : '#ff9800',
              animation: status === 'connected' ? 'none' : 'pulse 1.5s infinite'
            }} />
            {status === 'connected' ? '🟢 Connected' : '⏳ Connecting...'}
          </div>
          <button
            onClick={() => setShowUserModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.35)'
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.25)'
            }}
          >
            👤 {userName}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '12px', padding: '12px', background: 'transparent' }}>
        {/* Editor */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          background: 'white'
        }}>
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
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          animation: 'slideIn 0.3s ease',
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '16px',
            minWidth: '340px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.3s ease',
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: '#2c3e50' }}>
              👋 Welcome!
            </h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#7f8c8d' }}>
              What's your name?
            </p>
            <input
              type="text"
              defaultValue={userName}
              placeholder="Enter your name"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                marginBottom: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#667eea'
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0'
                (e.currentTarget as HTMLElement).style.boxShadow = 'none'
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
                padding: '12px',
                backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)'
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                (e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              Enter Document ✨
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
