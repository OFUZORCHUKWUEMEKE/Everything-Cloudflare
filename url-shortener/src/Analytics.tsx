import { useState, useEffect } from 'react'

interface AnalyticsData {
  shortId: string
  longUrl: string
  totalClicks: number
  createdAt: number
  stats?: {
    countriesTracked: string
    referrersTracked: string
    userAgentsTracked: string
  }
}

interface MockStats {
  countries: { country: string; clicks: number }[]
  referrers: { referrer: string; clicks: number }[]
  browsers: { browser: string; clicks: number }[]
}

export default function Analytics({ shortId, onBack }: { shortId: string; onBack: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [mockStats, setMockStats] = useState<MockStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/${shortId}`)
        if (!response.ok) throw new Error('Failed to fetch analytics')

        const analyticsData = await response.json()
        setData(analyticsData)

        // Generate mock breakdown data for visualization
        setMockStats({
          countries: [
            { country: 'United States', clicks: Math.floor(analyticsData.totalClicks * 0.4) },
            { country: 'United Kingdom', clicks: Math.floor(analyticsData.totalClicks * 0.2) },
            { country: 'Canada', clicks: Math.floor(analyticsData.totalClicks * 0.15) },
            { country: 'Germany', clicks: Math.floor(analyticsData.totalClicks * 0.1) },
            { country: 'Others', clicks: Math.floor(analyticsData.totalClicks * 0.15) },
          ],
          referrers: [
            { referrer: 'Google', clicks: Math.floor(analyticsData.totalClicks * 0.35) },
            { referrer: 'Direct', clicks: Math.floor(analyticsData.totalClicks * 0.3) },
            { referrer: 'Twitter', clicks: Math.floor(analyticsData.totalClicks * 0.2) },
            { referrer: 'LinkedIn', clicks: Math.floor(analyticsData.totalClicks * 0.15) },
          ],
          browsers: [
            { browser: 'Chrome', clicks: Math.floor(analyticsData.totalClicks * 0.5) },
            { browser: 'Safari', clicks: Math.floor(analyticsData.totalClicks * 0.25) },
            { browser: 'Firefox', clicks: Math.floor(analyticsData.totalClicks * 0.15) },
            { browser: 'Edge', clicks: Math.floor(analyticsData.totalClicks * 0.1) },
          ],
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [shortId])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#999', fontSize: '14px' }}>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          maxWidth: '500px',
        }}>
          <p style={{ color: '#d32f2f', fontSize: '14px' }}>❌ {error || 'URL not found'}</p>
          <button
            onClick={onBack}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            ← Back to Shortener
          </button>

          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#333' }}>
            📊 Analytics
          </h1>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#999' }}>
            Short ID: <code style={{ color: '#667eea', fontFamily: 'monospace' }}>{shortId}</code>
          </p>

          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>Original URL:</strong>
            </p>
            <p style={{
              margin: '0 0 12px 0',
              wordBreak: 'break-all',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#999',
            }}>
              {data.longUrl}
            </p>
            <p style={{ margin: '0' }}>
              <strong>Created:</strong> {new Date(data.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Total Clicks Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#999', textTransform: 'uppercase', fontWeight: '600' }}>
            Total Clicks
          </p>
          <h2 style={{
            margin: '0',
            fontSize: '48px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {data.totalClicks.toLocaleString()}
          </h2>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {/* Countries */}
          {mockStats && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                🌍 Top Countries
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockStats.countries.map((item) => (
                  <div key={item.country}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: '#333', fontWeight: '500' }}>{item.country}</span>
                      <span style={{ color: '#667eea', fontWeight: '600' }}>{item.clicks}</span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        width: `${(item.clicks / data.totalClicks) * 100}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referrers */}
          {mockStats && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                🔗 Top Referrers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockStats.referrers.map((item) => (
                  <div key={item.referrer}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: '#333', fontWeight: '500' }}>{item.referrer}</span>
                      <span style={{ color: '#667eea', fontWeight: '600' }}>{item.clicks}</span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        width: `${(item.clicks / data.totalClicks) * 100}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browsers */}
          {mockStats && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                🌐 Top Browsers
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockStats.browsers.map((item) => (
                  <div key={item.browser}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      fontSize: '12px',
                    }}>
                      <span style={{ color: '#333', fontWeight: '500' }}>{item.browser}</span>
                      <span style={{ color: '#667eea', fontWeight: '600' }}>{item.clicks}</span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        width: `${(item.clicks / data.totalClicks) * 100}%`,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          fontSize: '12px',
          color: '#666',
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#333' }}>
            📝 Phase 3 Note
          </p>
          <p style={{ margin: '0' }}>
            This dashboard shows mock data for demonstration. In production, detailed analytics are stored in Cloudflare's Analytics Engine and queried via GraphQL API.
          </p>
        </div>
      </div>
    </div>
  )
}
