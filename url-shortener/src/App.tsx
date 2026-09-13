import { useState } from 'react'

interface ShortenedUrl {
  shortId: string
  shortUrl: string
  longUrl: string
  createdAt: number
}

export default function App() {
  const [longUrl, setLongUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ShortenedUrl | null>(null)
  const [error, setError] = useState('')

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ longUrl }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to shorten URL')
      }

      const data = await response.json()
      setResult(data)
      setLongUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '28px',
          fontWeight: 700,
          color: '#333',
        }}>
          🔗 URL Shortener
        </h1>
        <p style={{
          margin: '0 0 32px 0',
          fontSize: '14px',
          color: '#999',
        }}>
          Turn long URLs into short, shareable links
        </p>

        <form onSubmit={handleShorten} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px',
            }}>
              Long URL
            </label>
            <input
              type="url"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              placeholder="https://example.com/very/long/url"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating...' : 'Create Short Link'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#ffe0e0',
            border: '1px solid #ff6b6b',
            borderRadius: '6px',
            color: '#d32f2f',
            fontSize: '13px',
          }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f0f7ff',
            border: '1px solid #667eea',
            borderRadius: '8px',
          }}>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#667eea',
              textTransform: 'uppercase',
            }}>
              ✅ Success!
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: '#666',
                marginBottom: '4px',
              }}>
                Short Link
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <input
                  type="text"
                  value={result.shortUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    background: 'white',
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.shortUrl)
                    alert('Copied!')
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#666',
              lineHeight: '1.6',
            }}>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Original:</strong>
              </p>
              <p style={{
                margin: '0 0 12px 0',
                wordBreak: 'break-all',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#999',
              }}>
                {result.longUrl}
              </p>
              <p style={{ margin: '0 0 4px 0' }}>
                <strong>Created:</strong> {new Date(result.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
