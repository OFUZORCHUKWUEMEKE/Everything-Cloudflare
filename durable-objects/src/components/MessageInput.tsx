import { useState, useRef, KeyboardEvent } from 'react';

interface MessageInputProps {
  disabled: boolean;
  onSendMessage: (text: string) => void;
}

export function MessageInput({
  disabled,
  onSendMessage,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          autoFocus
        />
        <button
          className="btn btn-send"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
