import { useState } from 'react'

interface ScoreFormProps {
  onSubmit: (points: number) => void
}

export default function ScoreForm({ onSubmit }: ScoreFormProps) {
  const [points, setPoints] = useState(10)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(points)
      setPoints(10)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--color-bg)',
      borderRadius: '12px',
      padding: 'clamp(16px, 4vw, 20px)',
      boxShadow: '0 8px 32px var(--color-shadow)',
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>➕ Add Score</h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}>
          Points
        </label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid var(--color-border)`,
            borderRadius: '6px',
            fontSize: '13px',
            boxSizing: 'border-box',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading 
            ? 'var(--color-text-muted)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s, transform 0.1s',
          opacity: loading ? 0.7 : 1,
          transform: loading ? 'scale(1)' : 'scale(1)',
          minHeight: '44px',
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {loading ? '⏳ Submitting...' : '✓ Submit'}
      </button>
    </form>
  )
}
