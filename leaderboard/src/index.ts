import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { ScoreBoard } from './scoreboard';

export { ScoreBoard };

interface Env {
  SCOREBOARD: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();
const wsClients = new Set<WebSocket>();

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>🏆 Leaderboard</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.tsx"></script>
      </body>
    </html>
  `);
});

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen: (evt, ws) => {
      wsClients.add(ws);
      console.log('WebSocket client connected. Total clients:', wsClients.size);
    },
    onMessage: async (evt, ws) => {
      try {
        const message = JSON.parse(evt.data as string);
        console.log('Received message:', message.type);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    },
    onClose: () => {
      wsClients.delete(ws);
      console.log('WebSocket client disconnected. Total clients:', wsClients.size);
    },
  };
}));

function broadcastToClients(message: any) {
  const data = JSON.stringify(message);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// GET /api/leaderboard
app.get('/api/leaderboard', async (c) => {
  const limit = c.req.query('limit') || '10';
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/leaderboard?limit=${limit}`)
  );

  return response;
});

// GET /api/player/:playerId
app.get('/api/player/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/player/${playerId}`)
  );

  return response;
});

// GET /api/profile/:playerId
app.get('/api/profile/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/profile/${playerId}`)
  );

  return response;
});

// PUT /api/profile/:playerId
app.put('/api/profile/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const body = await c.req.json();
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/profile/${playerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

  return response;
});

// GET /api/achievements/:playerId
app.get('/api/achievements/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/achievements/${playerId}`)
  );

  return response;
});

// GET /api/all-achievements
app.get('/api/all-achievements', async (c) => {
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/all-achievements')
  );

  return response;
});

// GET /api/archived-leaderboards - Get all archived leaderboards
app.get('/api/archived-leaderboards', async (c) => {
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/archived-leaderboards')
  );

  return response;
});

// GET /api/archived-leaderboard/:date - Get specific archived leaderboard
app.get('/api/archived-leaderboard/:date', async (c) => {
  const date = c.req.param('date');
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request(`https://scoreboard/archived-leaderboard/${date}`)
  );

  return response;
});

// GET /api/reset-stats - Get reset schedule info
app.get('/api/reset-stats', async (c) => {
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/reset-stats')
  );

  return response;
});

// POST /api/score
app.post('/api/score', async (c) => {
  const body = await c.req.json();
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

  const data = await response.json();

  if (data.success) {
    broadcastToClients({
      type: 'score_update',
      payload: data.data,
      timestamp: Date.now(),
    });
  }

  return c.json(data);
});

// GET /api/all
app.get('/api/all', async (c) => {
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/all')
  );

  return response;
});

// POST /api/reset
app.post('/api/reset', async (c) => {
  const stub = c.env.SCOREBOARD.get('default');

  const response = await stub.fetch(
    new Request('https://scoreboard/reset', { method: 'POST' })
  );

  return response;
});

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
