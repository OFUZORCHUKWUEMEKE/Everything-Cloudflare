import { useRef, useEffect, useState } from 'react'

interface UserPresence {
  userId: string;
  name: string;
  cursor: number;
  color: string;
}

interface EditorProps {
  content: string;
  cursor: number;
  users: UserPresence[];
  onChange: (text: string, position: number, length: number) => void;
  onCursorChange: (position: number) => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2']

export default function Editor({ content, cursor, users, onChange, onCursorChange }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [localCursor, setLocalCursor] = useState(0)
  const lineCount = content.split('\n').length

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    const selectionStart = e.target.selectionStart
    const selectionEnd = e.target.selectionEnd

    // Calculate what changed
    if (newText.length > content.length) {
      // Text was inserted
      const inserted = newText.substring(selectionStart - (newText.length - content.length), selectionStart)
      onChange(inserted, selectionStart - inserted.length, 0)
    } else if (newText.length < content.length) {
      // Text was deleted
      const deletedLength = content.length - newText.length
      onChange('', selectionStart, deletedLength)
    } else {
      // Text was replaced
      onChange(newText.substring(selectionStart - 1, selectionStart), selectionStart - 1, 1)
    }

    setLocalCursor(selectionStart)
    onCursorChange(selectionStart)
  }

  const handleClick = () => {
    if (textareaRef.current) {
      setLocalCursor(textareaRef.current.selectionStart)
      onCursorChange(textareaRef.current.selectionStart)
    }
  }

  const handleKeyUp = () => {
    if (textareaRef.current) {
      setLocalCursor(textareaRef.current.selectionStart)
      onCursorChange(textareaRef.current.selectionStart)
    }
  }

  // Keep textarea in sync with content from server
  useEffect(() => {
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      const oldPos = textareaRef.current.selectionStart
      textareaRef.current.value = content
      // Restore cursor if content only changed by insertion/deletion at different location
      if (content.length !== (textareaRef.current.value || '').length) {
        textareaRef.current.setSelectionRange(oldPos, oldPos)
      }
    }
  }, [content])

  // Render collaborative cursors as overlays
  const cursorElements = users
    .filter(u => u.cursor < content.length)
    .map((user) => {
      const lines = content.substring(0, user.cursor).split('\n')
      const row = lines.length - 1
      const col = lines[lines.length - 1].length

      return (
        <div
          key={user.userId}
          style={{
            position: 'absolute',
            left: `${col * 8}px`,
            top: `${row * 20 + 8}px`,
            width: '2px',
            height: '20px',
            backgroundColor: user.color,
            animation: 'blink 1s infinite',
            zIndex: 10,
          }}
          title={user.name}
        >
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-4px',
              backgroundColor: user.color,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            {user.name}
          </div>
        </div>
      )
    })

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'white',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }

        .editor-container::-webkit-scrollbar {
          width: 8px;
        }

        .editor-container::-webkit-scrollbar-track {
          background: #f5f5f5;
        }

        .editor-container::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }

        .editor-container::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>

      {/* Editor Wrapper */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Line numbers */}
        <div style={{
          width: '50px',
          padding: '20px 12px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e9ecef',
          color: '#999',
          fontSize: '13px',
          lineHeight: '1.5',
          userSelect: 'none',
          fontFamily: '"Fira Code", "Courier New", monospace',
          overflowY: 'hidden',
          textAlign: 'right',
        }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ height: '21px', margin: 0 }}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea and collaborative cursors */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onClick={handleClick}
            onKeyUp={handleKeyUp}
            placeholder="✍️  Start typing to edit the document..."
            className="editor-container"
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              padding: '20px',
              fontSize: '14px',
              fontFamily: '"Fira Code", "Courier New", monospace',
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: 'white',
              color: '#2c3e50',
              lineHeight: '1.5',
              position: 'relative',
              zIndex: 2,
            }}
          />

          {/* Collaborative cursors overlay */}
          <div style={{ position: 'absolute', top: 0, left: 50, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 1 }}>
            {users.map((user) => {
              const lines = content.substring(0, user.cursor).split('\n')
              const row = lines.length - 1
              const col = lines[lines.length - 1].length

              return (
                <div key={user.userId} style={{ position: 'relative' }}>
                  {/* Cursor line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${col * 8.4}px`,
                      top: `${20 + row * 21}px`,
                      width: '2px',
                      height: '21px',
                      backgroundColor: user.color,
                      animation: 'blink 1s infinite',
                      zIndex: 10,
                      boxShadow: `0 0 8px ${user.color}40`,
                    }}
                  />
                  {/* Name label */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${col * 8.4 - 20}px`,
                      top: `${20 + row * 21 - 22}px`,
                      backgroundColor: user.color,
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      zIndex: 11,
                      boxShadow: `0 2px 8px ${user.color}50`,
                    }}
                  >
                    {user.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid #e9ecef',
          fontSize: '12px',
          color: '#7f8c8d',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          <span>📊 Words: <strong>{content.split(/\s+/).filter(Boolean).length}</strong></span>
          <span>🔤 Characters: <strong>{content.length}</strong></span>
          <span>📝 Lines: <strong>{lineCount}</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {users.length > 0 && (
            <>
              <span>👥 Editing with:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {users.map((user) => (
                  <div
                    key={user.userId}
                    style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: user.color,
                      border: '2px solid white',
                      boxShadow: `0 0 4px ${user.color}50`,
                    }}
                    title={user.name}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
