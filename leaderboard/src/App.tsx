import { useState, useEffect, useRef } from 'react'
import Leaderboard from './components/Leaderboard'
import ScoreForm from './components/ScoreForm'

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  rank?: number;
}

interface WebSocketMessage {
  type: 'score_update' | 'player_joined' | 'leaderboard_update' | 'sync_request'
  payload: any
  timestamp: number
}

export default function App() {
  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem('playerName')
    return saved || `Player-${Math.random().toString(36).slice(2, 8)}`
  })
  const [playerId, setPlayerId] = useState(() => {
    const saved = localStorage.getItem('playerId')
    return saved || `player-${Date.now()}`
  })
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=10')
      const data = await res.json()
      if (data.success) {
        setLeaderboard(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e)
    }
  }

  // Fetch player stats
  const fetchPlayerStats = async () => {
    if (!playerId) return
    try {
      const res = await fetch(`/api/player/${playerId}`)
      const data = await res.json()
      if (data.success && !data.data.error) {
        setPlayerStats(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch player stats:', e)
    }
  }

  // Setup WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      setWsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        
        if (message.type === 'score_update') {
          // Refresh both leaderboard and player stats
          fetchLeaderboard()
          fetchPlayerStats()
        } else if (message.type === 'leaderboard_update') {
          setLeaderboard(message.payload.players)
        } else if (message.type === 'player_joined') {
          console.log(`${message.payload.playerName} joined!`)
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    wsRef.current = ws

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchLeaderboard()
      await fetchPlayerStats()
      setLoading(false)
    }
    init()
  }, [playerId])

  // Handle score submission
  const handleScoreSubmit = async (points: number) => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName,
          points,
        }),
      })
      const data = await res.json()
      if (data.success) {
        // Refresh leaderboard and stats
        await fetchLeaderboard()
        await fetchPlayerStats()
      }
    } catch (e) {
      console.error('Failed to submit score:', e)
    }
  }

  const handleNameChange = (name: string) => {
    setPlayerName(name)
    localStorage.setItem('playerName', name)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <header style={{
        padding: '24px',
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>🏆 Leaderboard</h1>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>Real-Time Scoring System</p>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: wsConnected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          color: wsConnected ? '#4caf50' : '#f44336',
        }}>
          {wsConnected ? '🟢 Live' : '🔴 Offline'}
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '24px',
      }}>
        {/* Main content */}
        <div>
          <Leaderboard
            players={leaderboard}
            loading={loading}
            playerStats={playerStats}
          />
        </div>

        {/* Sidebar */}
        <aside style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Player info */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>👤 Your Profile</h3>
            <input
              type="text"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            {playerStats && (
              <div style={{
                fontSize: '13px',
                color: '#666',
                marginTop: '12px',
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Rank:</span> #{playerStats.rank}
                </div>
                <div>
                  <span style={{ fontWeight: 600 }}>Score:</span> {playerStats.score}
                </div>
              </div>
            )}
          </div>

          {/* Score form */}
          <ScoreForm onSubmit={handleScoreSubmit} />
        </aside>
      </main>
    </div>
  )
}
