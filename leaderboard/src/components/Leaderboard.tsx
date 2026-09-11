import { useState } from 'react'
import UserProfile from './UserProfile'

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  rank?: number;
}

interface LeaderboardProps {
  players: PlayerScore[]
  loading: boolean
  playerStats: PlayerScore | null
}

export default function Leaderboard({ players, loading, playerStats }: LeaderboardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  if (loading) {
    return (
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 8px 32px var(--color-shadow)',
      }}>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
          ⏳ Loading leaderboard...
        </p>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 8px 32px var(--color-shadow)',
      }}>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
          No players yet. Be the first! 🚀
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px var(--color-shadow)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: 'clamp(16px, 4vw, 20px)',
        }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 20px)' }}>🏆 Top Players</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'clamp(12px, 2vw, 14px)',
          }}>
            <thead>
              <tr style={{
                background: 'var(--color-bg-secondary)',
                borderBottom: `1px solid var(--color-border)`,
              }}>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                }}>
                  Rank
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                }}>
                  Player
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'right', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                }}>
                  Score
                </th>
                <th style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  fontWeight: 600, 
                  color: 'var(--color-text)',
                }}>
                  View
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.playerId}
                  style={{
                    borderBottom: `1px solid var(--color-border)`,
                    background: playerStats?.playerId === player.playerId 
                      ? 'var(--color-bg-secondary)' 
                      : 'var(--color-bg)',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <td style={{ 
                    padding: '12px 16px', 
                    color: 'var(--color-primary)', 
                    fontWeight: 700,
                    fontSize: 'clamp(12px, 2vw, 15px)',
                  }}>
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    color: 'var(--color-text)', 
                    fontWeight: 500,
                    wordBreak: 'break-word',
                  }}>
                    {player.playerName}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    textAlign: 'right', 
                    color: 'var(--color-primary)', 
                    fontWeight: 700,
                    fontSize: 'clamp(12px, 2vw, 15px)',
                  }}>
                    {player.score.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedPlayerId(player.playerId)}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        minHeight: '32px',
                        minWidth: '32px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      👤
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayerId && (
        <UserProfile 
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </>
  )
}
