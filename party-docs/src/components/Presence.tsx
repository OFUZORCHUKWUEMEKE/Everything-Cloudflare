interface UserPresence {
  userId: string;
  name: string;
  cursor: number;
  color: string;
}

interface PresenceProps {
  users: UserPresence[];
}

export default function Presence({ users }: PresenceProps) {
  return (
    <aside
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        background: 'white',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          👥 Active Users
        </h3>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          {users.length === 0 ? 'Just you' : `${users.length} ${users.length === 1 ? 'person' : 'people'}`}
        </p>
      </div>

      {/* User List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', backgroundColor: '#f8f9fa' }}>
        {users.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#999',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '28px' }}>🎯</span>
            Waiting for others...
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map((user) => (
              <li
                key={user.userId}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  border: `2px solid ${user.color}20`,
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${user.color}30`
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: user.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${user.color}60`,
                    }}
                  />
                  <span style={{
                    fontWeight: 600,
                    color: '#2c3e50',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {user.name}
                  </span>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#999',
                  marginLeft: '24px',
                  padding: '4px 0',
                  background: '#f5f5f5',
                  paddingLeft: '8px',
                  borderLeft: `2px solid ${user.color}`,
                  borderRadius: '2px',
                }}>
                  📍 Char <strong>{user.cursor}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Info Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #e9ecef',
        backgroundColor: 'white',
        fontSize: '11px',
        color: '#999',
        textAlign: 'center',
      }}>
        💡 Cursors update in real-time
      </div>
    </aside>
  )
}
