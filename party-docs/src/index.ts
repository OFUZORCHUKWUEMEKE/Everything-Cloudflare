import { Hono } from 'hono';
import { DocumentRoom } from './document-room';

export { DocumentRoom };

interface Env {
  DOCUMENT: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Party Docs - Collaborative Editor</title>
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

app.get('/api/docs/:docId/ws', async (c) => {
  const docId = c.req.param('docId');

  try {
    const stub = c.env.DOCUMENT.get(docId);

    const upgradeHeader = c.req.header('Upgrade')?.toLowerCase();
    if (upgradeHeader !== 'websocket') {
      return c.text('Expected Upgrade: websocket', 400);
    }

    return await stub.fetch(c.req.raw);
  } catch (e) {
    console.error('WebSocket upgrade error:', e);
    return c.text('WebSocket upgrade failed', 500);
  }
});

app.get('/api/docs/:docId/sync', async (c) => {
  const docId = c.req.param('docId');
  const stub = c.env.DOCUMENT.get(docId);

  const response = await stub.fetch(new Request('https://document/api/sync'));
  return response;
});

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
