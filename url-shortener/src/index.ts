import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

interface CloudflareBindings {
  URLS: KVNamespace
  ANALYTICS: AnalyticsEngineDataPoint
}

interface ShortUrlData {
  longUrl: string
  createdAt: number
  creator?: string
  clicks: number
}

// Generate random short ID (6 characters)
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Create short URL
app.post('/api/shorten', async (c) => {
  const { longUrl } = await c.req.json<{ longUrl: string }>()

  if (!longUrl) {
    return c.json({ error: 'Missing longUrl' }, 400)
  }

  // Validate URL format
  try {
    new URL(longUrl)
  } catch {
    return c.json({ error: 'Invalid URL format' }, 400)
  }

  const shortId = generateShortId()
  const data: ShortUrlData = {
    longUrl,
    createdAt: Date.now(),
    clicks: 0,
  }

  await c.env.URLS.put(shortId, JSON.stringify(data))

  return c.json({
    shortId,
    shortUrl: `${new URL(c.req.url).origin}/${shortId}`,
    longUrl,
    createdAt: data.createdAt,
  })
})

// Redirect short URL to long URL
app.get('/:shortId', async (c) => {
  const shortId = c.req.param('shortId')

  const stored = await c.env.URLS.get(shortId)
  if (!stored) {
    return c.notFound()
  }

  const data: ShortUrlData = JSON.parse(stored)

  // Increment click counter
  data.clicks++
  await c.env.URLS.put(shortId, JSON.stringify(data))

  return c.redirect(data.longUrl, 301)
})

// Get URL info
app.get('/api/urls/:shortId', async (c) => {
  const shortId = c.req.param('shortId')

  const stored = await c.env.URLS.get(shortId)
  if (!stored) {
    return c.json({ error: 'URL not found' }, 404)
  }

  const data: ShortUrlData = JSON.parse(stored)

  return c.json({
    shortId,
    shortUrl: `${new URL(c.req.url).origin}/${shortId}`,
    longUrl: data.longUrl,
    createdAt: data.createdAt,
    clicks: data.clicks,
  })
})

export default app
