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

// Get Durable Object stub
function getScoreBoardStub(env: Env) {
  return env.SCOREBOARD.get('default');
}

// GET /api/leaderboard
app.get('/api/leaderboard', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const stub = getScoreBoardStub(c.env);

  // Class RPC: Direct method call instead of HTTP fetch
  const topPlayers = await stub.getTopPlayers(limit);

  return c.json({ success: true, data: topPlayers });
});

// GET /api/player/:playerId
app.get('/api/player/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const playerStats = await stub.getPlayerStats(playerId);

  return c.json({
    success: true,
    data: playerStats || { error: 'Player not found' },
  });
});

// GET /api/profile/:playerId
app.get('/api/profile/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const profile = await stub.getUserProfile(playerId);

  return c.json({
    success: true,
    data: profile || { error: 'Profile not found' },
  });
});

// PUT /api/profile/:playerId
app.put('/api/profile/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const body = await c.req.json();
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const updated = await stub.updateUserProfile(playerId, body);

  return c.json({ success: !!updated, data: updated });
});

// GET /api/achievements/:playerId
app.get('/api/achievements/:playerId', async (c) => {
  const playerId = c.req.param('playerId');
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const achievements = await stub.getPlayerAchievements(playerId);

  return c.json({ success: true, data: achievements });
});

// GET /api/all-achievements
app.get('/api/all-achievements', async (c) => {
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const achievements = await stub.getAllAchievements();

  return c.json({ success: true, data: achievements });
});

// POST /api/score
app.post('/api/score', async (c) => {
  const body = await c.req.json() as {
    playerId: string;
    playerName: string;
    points: number;
  };
  const stub = getScoreBoardStub(c.env);

  try {
    // Class RPC - Direct method call
    const newScore = await stub.addScore(
      body.playerId,
      body.playerName,
      body.points
    );

    // Broadcast to all connected clients
    broadcastToClients({
      type: 'score_update',
      payload: newScore,
      timestamp: Date.now(),
    });

    return c.json({ success: true, data: newScore });
  } catch (e) {
    return c.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
});

// GET /api/all
app.get('/api/all', async (c) => {
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const allPlayers = await stub.getAllPlayers();

  return c.json({ success: true, data: allPlayers });
});

// GET /api/reset-stats
app.get('/api/reset-stats', async (c) => {
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  const stats = await stub.getResetStats();

  return c.json({ success: true, data: stats });
});

// POST /api/reset
app.post('/api/reset', async (c) => {
  const stub = getScoreBoardStub(c.env);

  // Class RPC
  await stub.resetScores();

  return c.json({ success: true, message: 'Scores reset' });
});

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
