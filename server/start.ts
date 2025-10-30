import app from './index.ts';
import { serve } from '@hono/node-server';

const port = Number(process.env.PORT || 8787);
console.log(`API server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });


