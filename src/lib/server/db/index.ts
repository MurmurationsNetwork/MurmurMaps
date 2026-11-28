import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';

export function getDB() {
	if (!env || !env.DB) {
		throw new Error('D1 Database binding is missing in the environment variables');
	}
	return drizzle(env.DB);
}
