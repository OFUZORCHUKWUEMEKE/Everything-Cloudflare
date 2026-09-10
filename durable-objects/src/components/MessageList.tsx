import { useEffect, useRef } from 'react';

interface Message {
  id?: string;
  type?: 'system';
  user?: string;
  text: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  currentUser: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function MessageList({ messages, currentUser }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages empty">
        <span>No messages yet. Start the conversation!</span>
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((msg, idx) => {
        if (msg.type === 'system') {
          return (
            <div key={idx} className="message system">
              <div className="message-bubble">{msg.text}</div>
            </div>
          );
        }

        const isOwn = msg.user === currentUser;
        const messageClass = isOwn ? 'message own' : 'message other';
        const showSender =
          !isOwn && (idx === 0 || messages[idx - 1].user !== msg.user);

        return (
          <div key={msg.id || idx}>
            {showSender && <div className="message-sender">{msg.user}</div>}
            <div className={messageClass}>
              <div
                className="message-bubble"
                dangerouslySetInnerHTML={{ __html: escapeHtml(msg.text) }}
              />
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
