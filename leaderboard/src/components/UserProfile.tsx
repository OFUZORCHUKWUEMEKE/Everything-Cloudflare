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
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
          Loading profile...
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
      }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px' }}>
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
      padding: '20px',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px 24px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
        }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
              {profile.avatar} {profile.playerName}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '13px' }}>
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
            }}
          >
            X
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          padding: '24px',
          borderBottom: '1px solid #e0e0e0',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
              {profile.totalScore}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Total Score
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
              {profile.gamesPlayed}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Games Played
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
              {profile.highestScore}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Highest Score
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
              {profile.achievements.length}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Achievements
            </div>
          </div>
        </div>

        <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>About</h3>
            <button
              onClick={() => {
                if (isEditing) handleSaveBio()
                else setIsEditing(!isEditing)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {isEditing ? 'Save' : 'Edit'}
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
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: profile.bio ? '#333' : '#999',
              fontStyle: profile.bio ? 'normal' : 'italic',
            }}>
              {profile.bio || 'No bio yet'}
            </p>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
            Achievements ({profile.achievements.length})
          </h3>
          {profile.achievements.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {profile.achievements.map((id) => (
                <div
                  key={id}
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '24px',
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
            <p style={{ margin: 0, fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
              No achievements yet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
