import { getDB } from '#lib/server/db/index.ts';
import { getUserIdByPublicKey } from '#lib/server/models/public-key.ts';
import { updateUserSiteHints } from '#lib/server/models/user.ts';
import { authenticateUcanRequest } from '#lib/utils/ucan-utils.server.ts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const db = getDB();

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/users/site-hints',
			namespace: 'users',
			segments: ['PATCH']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const { enableSiteHints } = await request.json();

		if (typeof enableSiteHints !== 'boolean') {
			return json({ error: 'Invalid enableSiteHints value', success: false }, { status: 400 });
		}

		await updateUserSiteHints(db, userByPublicKey.userId, enableSiteHints);

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing PATCH request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
