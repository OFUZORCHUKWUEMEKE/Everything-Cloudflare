import { useState, useEffect } from 'react'

interface UserProfile {
  playerId: string;
  playerName: string;
  avatar?: string;
  bio?: string;
  joinedAt: number;
  totalScore: number;
  gamesPlayed: number;
  highestScore: number;
  achievements: string[];
}

interface UserProfileProps {
  playerId: string;
  onClose: () => void;
}

export default function UserProfile({ playerId, onClose }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [playerId])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/profile/${playerId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setProfile(data.data)
        setBio(data.data.bio || '')
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`/api/profile/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
      })
      const data = await res.json()
      if (data.success) {
        setProfile(data.data)
        setIsEditing(false)
      }
    } catch (e) {
      console.error('Failed to update profile:', e)
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{ background: 'var(--color-bg)', padding: '20px', borderRadius: '12px' }}>
          ⏳ Loading profile...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{ background: 'var(--color-bg)', padding: '20px', borderRadius: '12px' }}>
          Profile not found
        </div>
      </div>
    )
  }

  const joinDate = new Date(profile.joinedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(12px, 4vw, 20px)',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 'clamp(20px, 5vw, 32px)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          gap: '12px',
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 'clamp(18px, 5vw, 24px)', wordBreak: 'break-word' }}>
              {profile.avatar} {profile.playerName}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: 'clamp(11px, 2vw, 13px)' }}>
              Joined {joinDate}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 600,
              minWidth: '44px',
              minHeight: '44px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 'clamp(12px, 3vw, 16px)',
          padding: 'clamp(16px, 4vw, 24px)',
          borderBottom: `1px solid var(--color-border)`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {profile.totalScore}
            </div>
            <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Total
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {profile.gamesPlayed}
            </div>
            <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Games
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {profile.highestScore}
            </div>
            <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Highest
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {profile.achievements.length}
            </div>
            <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Badges
            </div>
          </div>
        </div>

        <div style={{ padding: 'clamp(16px, 4vw, 24px)', borderBottom: `1px solid var(--color-border)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>About</h3>
            <button
              onClick={() => {
                if (isEditing) handleSaveBio()
                else setIsEditing(!isEditing)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 8px',
              }}
            >
              {isEditing ? '💾 Save' : '✏️ Edit'}
            </button>
          </div>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                border: `1px solid var(--color-border)`,
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '13px',
                boxSizing: 'border-box',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
              }}
            />
          ) : (
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: profile.bio ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontStyle: profile.bio ? 'normal' : 'italic',
            }}>
              {profile.bio || 'No bio yet'}
            </p>
          )}
        </div>

        <div style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
            Achievements ({profile.achievements.length})
          </h3>
          {profile.achievements.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
              gap: '12px',
            }}>
              {profile.achievements.map((id) => (
                <div
                  key={id}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    padding: 'clamp(12px, 3vw, 16px)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: 'clamp(20px, 5vw, 24px)',
                  }}
                >
                  {id === 'first_blood' && '💧'}
                  {id === 'century' && '💯'}
                  {id === 'thousand' && '🎉'}
                  {id === 'hot_streak' && '🔥'}
                  {id === 'high_roller' && '💰'}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No achievements yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
