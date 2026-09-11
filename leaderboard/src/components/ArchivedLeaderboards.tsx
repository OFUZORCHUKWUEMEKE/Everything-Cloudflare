import { useState, useEffect } from 'react'

interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  rank?: number;
}

interface ArchivedLeaderboard {
  date: string;
  topPlayers: PlayerScore[];
  timestamp: number;
}

interface ResetStats {
  lastResetTime: number;
  lastResetDate: string;
  nextResetTime: number;
  nextResetDate: string;
  archivedCount: number;
}

export default function ArchivedLeaderboards() {
  const [resetStats, setResetStats] = useState<ResetStats | null>(null)
  const [archives, setArchives] = useState<ArchivedLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    fetchResetStats()
    fetchArchives()
  }, [])

  const fetchResetStats = async () => {
    try {
      const res = await fetch('/api/reset-stats')
      const data = await res.json()
      if (data.success) {
        setResetStats(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch reset stats:', e)
    }
  }

  const fetchArchives = async () => {
    try {
      const res = await fetch('/api/archived-leaderboards')
      const data = await res.json()
      if (data.success) {
        setArchives(data.data || [])
      }
    } catch (e) {
      console.error('Failed to fetch archives:', e)
    } finally {
      setLoading(false)
    }
  }

  const timeUntilReset = resetStats
    ? Math.max(0, resetStats.nextResetTime - Date.now())
    : 0

  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60))
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))

  if (loading) {
    return (
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px var(--color-shadow)',
      }}>
        Loading archives...
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-bg)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px var(--color-shadow)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: 'clamp(16px, 4vw, 20px)',
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 'clamp(18px, 4vw, 20px)' }}>
          ⏰ Leaderboard History
        </h2>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '13px' }}>
          Daily resets at 12:00 AM UTC
        </p>
      </div>

      {/* Reset Stats */}
      {resetStats && (
        <div style={{
          padding: 'clamp(16px, 4vw, 20px)',
          borderBottom: `1px solid var(--color-border)`,
          background: 'var(--color-bg-secondary)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Last Reset
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text)', marginTop: '4px' }}>
                {new Date(resetStats.lastResetTime).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Next Reset
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 600 }}>
                {hoursUntilReset}h {minutesUntilReset}m
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                Archives Stored
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text)', marginTop: '4px' }}>
                {resetStats.archivedCount} days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archives List */}
      <div style={{ padding: 'clamp(16px, 4vw, 20px)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
          📚 Previous Leaderboards
        </h3>

        {archives.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No archived leaderboards yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {archives.map((archive) => (
              <button
                key={archive.date}
                onClick={() => setSelectedDate(selectedDate === archive.date ? null : archive.date)}
                style={{
                  background: selectedDate === archive.date ? 'var(--color-bg-secondary)' : 'transparent',
                  border: `1px solid var(--color-border)`,
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedDate !== archive.date) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDate !== archive.date) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      {new Date(archive.timestamp).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {archive.topPlayers.length} players
                    </div>
                  </div>
                  <div style={{ fontSize: '18px' }}>
                    {selectedDate === archive.date ? '▼' : '▶'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Archive View */}
      {selectedDate && (
        <div style={{
          padding: 'clamp(16px, 4vw, 20px)',
          borderTop: `1px solid var(--color-border)`,
          background: 'var(--color-bg-secondary)',
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 600 }}>
            Top 10 from {selectedDate}
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              fontSize: '13px',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ borderBottom: `1px solid var(--color-border)` }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Rank</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Player</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {archives
                  .find((a) => a.date === selectedDate)
                  ?.topPlayers.slice(0, 10)
                  .map((player) => (
                    <tr key={player.playerId} style={{ borderBottom: `1px solid var(--color-border)` }}>
                      <td style={{ padding: '8px', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--color-text)' }}>
                        {player.playerName}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {player.score}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
