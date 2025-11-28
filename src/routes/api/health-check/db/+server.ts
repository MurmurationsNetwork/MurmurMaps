import { getDB } from '$lib/server/db';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform = { env: { DB: {} as D1Database } } }) => {
	try {
		const db = getDB(platform.env);
		await db.run('SELECT 1');
		return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
	} catch (err) {
		console.error('Error checking DB status:', err);
		return new Response(JSON.stringify({ status: 'down' }), { status: 500 });
	}
};
