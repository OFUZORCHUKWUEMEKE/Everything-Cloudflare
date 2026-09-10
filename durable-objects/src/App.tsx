import { useState, useCallback, useMemo } from 'react';
import './App.css';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatScreen } from './components/ChatScreen';

interface Message {
  id?: string;
  type?: 'system';
  user?: string;
  text: string;
  timestamp: number;
}

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'chat'>('welcome');
  const [currentRoom, setCurrentRoom] = useState('general');
  const [currentUser, setCurrentUser] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<string[]>([]);

  const wsUrl = useMemo(() => {
    if (screen === 'chat' && currentRoom) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:8787';
      return `${protocol}//${host}/rooms/${currentRoom}/ws`;
    }
    return '';
  }, [screen, currentRoom]);

  const handleJoin = useCallback((room: string, user: string) => {
    setCurrentRoom(room);
    setCurrentUser(user);
    setMessages([]);
    setUsers([]);
    setScreen('chat');
  }, []);

  const handleLogout = useCallback(() => {
    setScreen('welcome');
    setMessages([]);
    setUsers([]);
  }, []);

  const handleMessage = useCallback((msg: any) => {
    if (msg.type === 'message') {
      setMessages((prev) => [...prev, msg.data]);
    } else if (msg.type === 'user-joined') {
      setUsers(msg.data.users);
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `${msg.data.user} joined the room`,
          timestamp: Date.now(),
        },
      ]);
    } else if (msg.type === 'user-left') {
      setUsers(msg.data.users);
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `${msg.data.user} left the room`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  return (
    <div className="app">
      {screen === 'welcome' ? (
        <WelcomeScreen onJoin={handleJoin} />
      ) : (
        <ChatScreen
          currentRoom={currentRoom}
          currentUser={currentUser}
          messages={messages}
          users={users}
          wsUrl={wsUrl}
          onMessage={handleMessage}
          onLogout={handleLogout}
          onSwitchRoom={(room) => {
            setCurrentRoom(room);
            setMessages([]);
            setUsers([]);
          }}
        />
      )}
    </div>
  );
}
