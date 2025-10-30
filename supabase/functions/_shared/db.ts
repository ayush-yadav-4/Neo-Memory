import { neon } from 'https://esm.sh/@neondatabase/serverless@0.10.4';

let cachedSql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (cachedSql) return cachedSql;
  const connectionString = Deno.env.get('NEON_DATABASE_URL') ?? '';
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL is not set');
  }
  cachedSql = neon(connectionString);
  return cachedSql;
}


