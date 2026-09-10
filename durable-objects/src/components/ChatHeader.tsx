interface ChatHeaderProps {
  roomName: string;
  onlineCount: number;
  onShowUsers: () => void;
}

export function ChatHeader({
  roomName,
  onlineCount,
  onShowUsers,
}: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <h3>#{roomName}</h3>
        <div className="online-count">
          <div className="online-count-dot"></div>
          <span>{onlineCount} online</span>
        </div>
      </div>
      <button className="btn user-list-btn" onClick={onShowUsers}>
        👥 Users ({onlineCount})
      </button>
    </div>
  );
}
