import { getDB } from '$lib/server/db';
import { verifySignature } from '$lib/server/db/crypto.server';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { isValidBase58btc } from '$lib/utils/base58btc';
import type { D1Database } from '@cloudflare/workers-types';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

interface AuthResult {
	userId?: number;
	db: DrizzleD1Database;
	xPublicKey: string;
	body?: unknown;
}

export async function authenticateRequest(
	platform: { env: { DB: D1Database } },
	request: Request,
	options?: {
		parseBody?: boolean;
		requiredUserId?: boolean;
	}
): Promise<
	{ success: true; data: AuthResult } | { success: false; error: string; status: number }
> {
	const db = getDB(platform.env);
	const body = options?.parseBody ? await request.json() : undefined;
	const xPublicKey = request.headers.get('X-Public-Key');
	const xSignature = request.headers.get('X-Signature');
	const xTimer = request.headers.get('X-Timer');
	const xTimerSignature = request.headers.get('X-Timer-Signature');

	if (!xPublicKey) {
		return { success: false, error: 'Missing public key', status: 400 };
	}

	if (!xSignature) {
		return { success: false, error: 'Missing signature', status: 400 };
	}

	if (!xTimer) {
		return { success: false, error: 'Missing timer', status: 400 };
	}

	if (!xTimerSignature) {
		return { success: false, error: 'Missing timer signature', status: 400 };
	}

	if (!isValidBase58btc(xSignature) || !isValidBase58btc(xTimerSignature)) {
		return { success: false, error: 'Invalid signature format', status: 400 };
	}

	const isVerified = await verifySignature(
		body ? JSON.stringify(body) : '{}',
		xSignature,
		xPublicKey,
		xTimer,
		xTimerSignature
	);

	if (!isVerified.success) {
		return { success: false, error: isVerified.error ?? 'Verification failed', status: 400 };
	}

	let userId: number | undefined = undefined;

	if (options?.requiredUserId ?? true) {
		const userByPublicKey = await getUserIdByPublicKey(db, xPublicKey);

		if (!userByPublicKey) {
			return { success: false, error: 'No account associated with this key', status: 200 };
		}

		userId = userByPublicKey.userId;
	}

	return { success: true, data: { userId, db, xPublicKey, body } };
}
