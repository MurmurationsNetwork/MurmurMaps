import { getDB } from '$lib/server/db';
import { getProfile } from '$lib/server/models/profiles';
import type { D1Database } from '@cloudflare/workers-types';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	params,
	platform = { env: { DB: {} as D1Database } }
}) => {
	const { cuid } = params;
	if (!cuid) {
		return json({ error: 'Profile CUID is required' }, { status: 400 });
	}

	const db = getDB(platform.env);

	try {
		const profile = await getProfile(db, cuid);

		if (!profile) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		const parsedProfile = JSON.parse(profile.profile ?? '{}');

		return json(parsedProfile, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization'
			}
		});
	} catch (err) {
		console.error('Error fetching profile:', err);
		return json(
			{ error: 'Unable to connect to the database, please try again in a few minutes' },
			{ status: 500 }
		);
	}
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization'
		}
	});
};
