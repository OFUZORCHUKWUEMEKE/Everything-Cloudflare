interface SidebarProps {
  currentRoom: string;
  currentUser: string;
  rooms: string[];
  userCount: number;
  onSwitchRoom: (room: string) => void;
  onShowUsers: () => void;
  onLogout: () => void;
}

export function Sidebar({
  currentRoom,
  currentUser,
  rooms,
  userCount,
  onSwitchRoom,
  onShowUsers,
  onLogout,
}: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>CloudChat</h2>
        <div className="user-badge">
          <div className="status-dot"></div>
          <span>{currentUser}</span>
        </div>
      </div>

      <div className="room-list">
        {rooms.map((room) => (
          <div
            key={room}
            className={`room-item ${room === currentRoom ? 'active' : ''}`}
            onClick={() => onSwitchRoom(room)}
          >
            <div className="room-item-name">#{room}</div>
            <div className="room-item-info">Join to chat</div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn user-list-btn"
          onClick={onShowUsers}
          style={{ width: '100%', marginBottom: '12px' }}
        >
          👥 Users ({userCount})
        </button>
        <button className="btn btn-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
