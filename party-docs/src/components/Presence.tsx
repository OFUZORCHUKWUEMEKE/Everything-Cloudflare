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
        width: '240px',
        borderLeft: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#333' }}>
          Active Users
        </h3>
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#666',
          }}
        >
          {users.length} {users.length === 1 ? 'person' : 'people'}
        </p>
      </div>

      {/* User List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {users.length === 0 ? (
          <div style={{ padding: '16px 12px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            Just you for now!
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {users.map((user) => (
              <li
                key={user.userId}
                style={{
                  padding: '8px 12px',
                  marginBottom: '4px',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: user.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px', marginLeft: '20px' }}>
                  Char {user.cursor}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
