import { removeDidPrefix } from '$lib/crypto';
import { getDB } from '$lib/server/db';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { authenticateUcanRequest, parseUcanDelegation } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const {
			publicKey,
			error,
			status: ucanStatus
		} = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/delegations/receive',
			namespace: 'delegations',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status: ucanStatus });
		}

		const { delegationToken } = await request.json();

		const { fromDid, toDid, expiresAt, capabilities } = parseUcanDelegation(delegationToken);

		console.log(expiresAt);

		const fromUserByPublicKey = await getUserIdByPublicKey(db, removeDidPrefix(fromDid));

		if (!fromUserByPublicKey) {
			return json({ error: 'From user not found', success: false }, { status: 404 });
		}

		const toUserByPublicKey = await getUserIdByPublicKey(db, removeDidPrefix(toDid));

		if (!toUserByPublicKey) {
			return json({ error: 'To user not found', success: false }, { status: 404 });
		}

		// iterate over capabilities and check if they are valid
		console.log(capabilities);

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Error receiving delegation:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to receive delegation'
			},
			{ status: 500 }
		);
	}
};
