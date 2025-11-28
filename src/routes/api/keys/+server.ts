import { getDB } from '$lib/server/db';
import { deleteLoginToken, isTokenValidAndGetUserId } from '$lib/server/models/login-token';
import {
	deletePublicKey,
	getPublicKeysByUserId,
	getUserIdByPublicKey,
	insertPublicKey
} from '$lib/server/models/public-key';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/keys',
			namespace: 'keys',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const userByPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const userPublicKeys = await getPublicKeysByUserId(db, userByPublicKey.userId);

		return json(
			{ data: { publicKeys: userPublicKeys, currentPublicKey: publicKey }, success: true },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const { publicKey, token } = await request.json();

		if (!publicKey) {
			return json({ error: 'Missing public key', success: false }, { status: 400 });
		}

		if (!token) {
			return json({ error: 'Missing token', success: false }, { status: 400 });
		}

		const db = getDB(platform.env);

		const userId = await isTokenValidAndGetUserId(db, token);

		if (!userId) {
			return json({ error: 'Invalid or expired token', success: false }, { status: 404 });
		}

		const existingPublicKey = await getUserIdByPublicKey(db, publicKey);

		if (existingPublicKey) {
			return json(
				{ error: 'You have already linked this public key to another account', success: false },
				{ status: 409 }
			);
		}

		await insertPublicKey(db, userId, publicKey);
		await deleteLoginToken(db, userId, token);

		return json({ data: { publicKey }, success: true }, { status: 201 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const {
			publicKey: userPublicKey,
			error,
			status
		} = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/keys',
			namespace: 'keys',
			segments: ['DELETE']
		});

		if (!userPublicKey) {
			return json({ error, success: false }, { status });
		}

		const { publicKey } = await request.json();

		if (!publicKey) {
			return json({ error: 'Missing public key', success: false }, { status: 400 });
		}

		if (userPublicKey === publicKey) {
			return json(
				{ error: 'Cannot delete the current public key', success: false },
				{ status: 400 }
			);
		}

		const userByPublicKey = await getUserIdByPublicKey(db, userPublicKey);

		if (!userByPublicKey) {
			return json({ error: 'User not found', success: false }, { status: 404 });
		}

		const deleteResult = await deletePublicKey(db, userByPublicKey.userId, publicKey);

		if (!deleteResult) {
			return json(
				{ error: 'Public key has already been deleted', success: false },
				{ status: 404 }
			);
		}

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing DELETE request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
