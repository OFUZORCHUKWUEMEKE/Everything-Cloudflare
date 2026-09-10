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

export default function Editor({ content, cursor, users, onChange, onCursorChange }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [localCursor, setLocalCursor] = useState(0)

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
      }}
    >
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        placeholder="Start typing to edit the document..."
        style={{
          flex: 1,
          padding: '20px',
          fontSize: '14px',
          fontFamily: '"Courier New", monospace',
          border: 'none',
          outline: 'none',
          resize: 'none',
          backgroundColor: 'white',
          color: '#333',
          lineHeight: '1.5',
        }}
      />

      {/* Word count footer */}
      <div
        style={{
          padding: '8px 20px',
          borderTop: '1px solid #e0e0e0',
          fontSize: '12px',
          color: '#666',
          backgroundColor: '#f5f5f5',
        }}
      >
        Words: {content.split(/\s+/).filter(Boolean).length} • Characters: {content.length}
      </div>
    </div>
  )
}
