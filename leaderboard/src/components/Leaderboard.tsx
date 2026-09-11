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
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>Loading leaderboard...</p>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>No players yet. Be the first!</p>
      </div>
    )
  }

  return (
    <>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 24px',
        }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>🏆 Top Players</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr style={{
                background: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0',
              }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#333' }}>Rank</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#333' }}>Player</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#333' }}>Score</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#333' }}>View</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.playerId}
                  style={{
                    borderBottom: '1px solid #e0e0e0',
                    background: playerStats?.playerId === player.playerId ? '#f9f9ff' : 'white',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <td style={{ padding: '12px 16px', color: '#667eea', fontWeight: 700 }}>
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#333', fontWeight: 500 }}>
                    {player.playerName}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#667eea', fontWeight: 700, fontSize: '15px' }}>
                    {player.score.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedPlayerId(player.playerId)}
                      style={{
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Profile
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
