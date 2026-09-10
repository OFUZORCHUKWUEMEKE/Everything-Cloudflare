import { useState, FormEvent } from 'react';

interface WelcomeScreenProps {
  onJoin: (room: string, user: string) => void;
}

export function WelcomeScreen({ onJoin }: WelcomeScreenProps) {
  const [room, setRoom] = useState('general');
  const [user, setUser] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (room.trim() && user.trim()) {
      onJoin(room.trim(), user.trim());
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1>☁️ CloudChat</h1>
        <p>Real-time chat powered by Cloudflare Durable Objects</p>

        <form className="welcome-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="roomInput">Room</label>
            <input
              type="text"
              id="roomInput"
              placeholder="e.g., general, random, tech"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="userInput">Your Name</label>
            <input
              type="text"
              id="userInput"
              placeholder="e.g., Alice, Bob, Charlie"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
