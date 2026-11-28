import { getDB } from '#lib/server/db/index.ts';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	try {
		const db = getDB();
		await db.run('SELECT 1');
		return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
	} catch (err) {
		console.error('Error checking DB status:', err);
		return new Response(JSON.stringify({ status: 'down' }), { status: 500 });
	}
};
