import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeContext'
import Leaderboard from './components/Leaderboard'
import ScoreForm from './components/ScoreForm'
import ArchivedLeaderboards from './components/ArchivedLeaderboards'

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
  const { isDark, toggleTheme } = useTheme()
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

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchLeaderboard()
      await fetchPlayerStats()
      setLoading(false)
    }
    init()
  }, [playerId])

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
    <div style={{ 
      minHeight: '100vh', 
      background: isDark 
        ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        padding: '16px 24px',
        textAlign: 'center',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 'clamp(24px, 5vw, 32px)' }}>🏆 Leaderboard</h1>
          <p style={{ margin: 0, fontSize: 'clamp(12px, 2vw, 14px)', opacity: 0.9 }}>Real-Time Scoring System</p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: wsConnected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: wsConnected ? '#4caf50' : '#f44336',
          }}>
            {wsConnected ? '🟢 Live' : '🔴 Offline'}
          </div>

          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 24px)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(16px, 4vw, 24px)',
      }}>
        {/* Top Row - Leaderboard and Sidebar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 300px)',
          gap: 'clamp(16px, 4vw, 24px)',
        }}>
          {/* Main leaderboard */}
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
            gap: 'clamp(16px, 4vw, 24px)',
          }}>
            {/* Player info */}
            <div style={{
              background: 'var(--color-bg)',
              borderRadius: '12px',
              padding: 'clamp(16px, 4vw, 20px)',
              boxShadow: '0 8px 32px var(--color-shadow)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>👤 Your Profile</h3>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Your name"
                style={{
                  width: '100%',
                  padding: '10px',
                  marginBottom: '12px',
                  border: `1px solid var(--color-border)`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
              {playerStats && (
                <div style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
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
        </div>

        {/* Bottom Row - Archive History */}
        <div>
          <ArchivedLeaderboards />
        </div>
      </main>

      {/* Responsive grid adjustment */}
      <style>{`
        @media (max-width: 768px) {
          main > div:first-of-type {
            grid-template-columns: 1fr;
          }
          
          main {
            padding: 12px !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 480px) {
          main {
            padding: 8px !important;
            gap: 12px !important;
          }

          h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
}
