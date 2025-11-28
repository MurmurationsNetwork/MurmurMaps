import { getDB } from '$lib/server/db';
import { createNode, getNode, getNodes } from '$lib/server/models/node';
import type { NodeInsert } from '$lib/types/node';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params
}) => {
	try {
		const db = getDB(platform.env);
		const clusterUuid = params?.cluster_uuid;

		// Validate clusterUuid
		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		const nodes = await getNodes(db, clusterUuid);

		if (!nodes || nodes.length === 0) {
			return json(
				{ error: 'No nodes found for the given cluster_uuid', success: false },
				{ status: 404 }
			);
		}

		return json({ data: nodes, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
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
			hierPart: '/clusters/*/nodes',
			namespace: 'clusters',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status: ucanStatus });
		}

		const clusterUuid = params?.cluster_uuid;
		const body = await request.json();
		const { profileUrl, data, lastUpdated, status, isAvailable, unavailableMessage, hasAuthority } =
			body;

		// Validate data
		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		if (!data || !profileUrl || !lastUpdated) {
			return json({ error: 'Invalid data provided', success: false }, { status: 400 });
		}

		if (profileUrl.length > 2000) {
			return json({ error: 'profile_url is too long', success: false }, { status: 400 });
		}

		if (!Number.isInteger(lastUpdated)) {
			return json({ error: 'lastUpdated is not an integer', success: false }, { status: 400 });
		}

		const existingNode = await getNode(db, clusterUuid, profileUrl);

		if (existingNode.length > 0) {
			return json({ error: 'Node already exists', success: false }, { status: 400 });
		}

		// Insert data
		const node: NodeInsert = {
			clusterUuid,
			profileUrl,
			data: JSON.stringify(data),
			lastUpdated: lastUpdated,
			status,
			isAvailable,
			unavailableMessage,
			hasAuthority
		};

		const result = await createNode(db, node);

		return json({ data: result, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
