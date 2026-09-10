import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Sidebar } from './Sidebar';
import { UserModal } from './UserModal';

interface Message {
  id?: string;
  type?: 'system';
  user?: string;
  text: string;
  timestamp: number;
}

interface ChatScreenProps {
  currentRoom: string;
  currentUser: string;
  messages: Message[];
  users: string[];
  wsUrl: string;
  onMessage: (msg: any) => void;
  onLogout: () => void;
  onSwitchRoom: (room: string) => void;
}

const ROOMS = ['general', 'random', 'tech', 'design', 'support'];

export function ChatScreen({
  currentRoom,
  currentUser,
  messages,
  users,
  wsUrl,
  onMessage,
  onLogout,
  onSwitchRoom,
}: ChatScreenProps) {
  const [showUserModal, setShowUserModal] = useState(false);
  const { send, isConnected } = useWebSocket({
    url: wsUrl,
    onMessage,
    onOpen: () => {
      send({ type: 'join', user: currentUser });
    },
  });

  const handleSendMessage = (text: string) => {
    if (text.trim() && isConnected) {
      send({
        type: 'message',
        user: currentUser,
        text: text.trim(),
      });
    }
  };

  const handleSwitchRoom = (room: string) => {
    onSwitchRoom(room);
  };

  return (
    <div className="chat-screen">
      <Sidebar
        currentRoom={currentRoom}
        currentUser={currentUser}
        rooms={ROOMS}
        userCount={users.length}
        onSwitchRoom={handleSwitchRoom}
        onShowUsers={() => setShowUserModal(true)}
        onLogout={onLogout}
      />

      <div className="chat-area">
        <ChatHeader
          roomName={currentRoom}
          onlineCount={users.length}
          onShowUsers={() => setShowUserModal(true)}
        />

        <MessageList messages={messages} currentUser={currentUser} />

        <MessageInput
          disabled={!isConnected}
          onSendMessage={handleSendMessage}
        />
      </div>

      <UserModal
        isOpen={showUserModal}
        users={users}
        currentUser={currentUser}
        onClose={() => setShowUserModal(false)}
      />
    </div>
  );
}
