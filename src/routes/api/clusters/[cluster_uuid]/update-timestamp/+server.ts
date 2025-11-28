import { getDB } from '$lib/server/db';
import { updateClusterTimestamp } from '$lib/server/models/cluster';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params,
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
			hierPart: '/clusters/*/update-timestamp',
			namespace: 'clusters',
			segments: ['PATCH']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status: ucanStatus });
		}

		const clusterUuid = params.cluster_uuid;
		const { lastUpdated } = await request.json();

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		if (isNaN(lastUpdated)) {
			return json({ error: 'Invalid lastUpdated date', success: false }, { status: 400 });
		}

		const result = await updateClusterTimestamp(db, clusterUuid, lastUpdated);

		if (result?.meta?.changes === 0) {
			return json({ error: 'Failed to update cluster timestamp', success: false }, { status: 500 });
		}

		return json({ data: null, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error updating cluster timestamp:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
