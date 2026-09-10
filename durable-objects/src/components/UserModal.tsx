interface UserModalProps {
  isOpen: boolean;
  users: string[];
  currentUser: string;
  onClose: () => void;
}

export function UserModal({
  isOpen,
  users,
  currentUser,
  onClose,
}: UserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content">
        <div className="modal-header">
          <span>Active Users</span>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="users-list">
          {users.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}>
              No users yet
            </div>
          ) : (
            users.map((user) => (
              <div key={user} className="user-item">
                <div className="user-item-dot"></div>
                <div className="user-item-name">
                  {user}
                  {user === currentUser && ' (you)'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
