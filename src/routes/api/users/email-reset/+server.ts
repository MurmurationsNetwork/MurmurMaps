import { getDB } from '$lib/server/db';
import { doesUserIdHaveEmail } from '$lib/server/models/email';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { updateUserEmailReset } from '$lib/server/models/user';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/users/email-reset',
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

		const { emailReset } = await request.json();

		if (typeof emailReset !== 'boolean') {
			return json({ error: 'Invalid emailReset value', success: false }, { status: 400 });
		}

		const hasEmail = await doesUserIdHaveEmail(db, userByPublicKey.userId);
		if (!hasEmail) {
			return json(
				{ error: 'You need to add an email to your account', success: false },
				{ status: 400 }
			);
		}

		await updateUserEmailReset(db, userByPublicKey.userId, emailReset);

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing PATCH request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
