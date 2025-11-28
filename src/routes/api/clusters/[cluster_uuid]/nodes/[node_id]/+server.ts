import { getDB } from '$lib/server/db';
import { deleteNode, getPublishedNodeById, updateNode } from '$lib/server/models/node';
import type { NodeDbUpdateInput } from '$lib/types/node';
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
		const clusterUuid = params.cluster_uuid;
		const nodeId = params.node_id;

		// Validate input
		if (!clusterUuid || !nodeId) {
			return json({ error: 'Missing cluster_uuid or node_id', success: false }, { status: 400 });
		}

		if (!Number.isInteger(parseInt(nodeId))) {
			return json({ error: 'Invalid node_id', success: false }, { status: 400 });
		}

		const node = await getPublishedNodeById(db, clusterUuid, parseInt(nodeId));

		if (!node) {
			return json({ error: 'Node not found', success: false }, { status: 404 });
		}

		return json({ data: node[0], success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({
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
			hierPart: '/clusters/*/nodes/*',
			namespace: 'clusters',
			segments: ['PUT']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status: ucanStatus });
		}

		const clusterUuid = params.cluster_uuid;
		const nodeId = params.node_id;

		// Validate input
		if (!clusterUuid || !nodeId) {
			return json({ error: 'Missing cluster_uuid or node_id', success: false }, { status: 400 });
		}

		if (!Number.isInteger(parseInt(nodeId))) {
			return json({ error: 'Invalid node_id', success: false }, { status: 400 });
		}

		const {
			data,
			updatedData,
			status,
			lastUpdated,
			isAvailable,
			unavailableMessage,
			hasAuthority,
			hasUpdated
		} = await request.json();

		const node: NodeDbUpdateInput = {
			data: JSON.stringify(data),
			updatedData: updatedData ? JSON.stringify(updatedData) : null,
			status,
			lastUpdated,
			isAvailable,
			unavailableMessage,
			hasAuthority,
			hasUpdated,
			updatedAt: Math.floor(new Date().getTime() / 1000)
		};

		// Update node
		const result = await updateNode(db, clusterUuid, parseInt(nodeId), node);

		return json({ data: result, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing PATCH request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	params
}) => {
	try {
		const db = getDB(platform.env);
		const clusterUuid = params.cluster_uuid;
		const nodeId = params.node_id;

		// Validate input
		if (!clusterUuid || !nodeId) {
			return json({ error: 'Missing cluster_uuid or node_id', success: false }, { status: 400 });
		}

		if (!Number.isInteger(parseInt(nodeId))) {
			return json({ error: 'Invalid node_id', success: false }, { status: 400 });
		}

		// Delete node
		const result = await deleteNode(db, clusterUuid, parseInt(nodeId));

		if (result?.meta?.changes === 0) {
			return json({ error: 'Failed to delete node', success: false }, { status: 500 });
		}

		return json({ data: null, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing DELETE request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
