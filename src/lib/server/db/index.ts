import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';

export function getDB(env: { DB: D1Database }) {
	if (!env || !env.DB) {
		throw new Error('D1 Database binding is missing in the environment variables');
	}
	return drizzle(env.DB);
}
