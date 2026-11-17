import { getDB } from '#lib/server/db/index.ts';
import { deleteCluster, getCluster, updateCluster } from '#lib/server/models/cluster.ts';
import { deleteNodes } from '#lib/server/models/node.ts';
import type { ClusterDbUpdateInput, ClusterPublic } from '#lib/types/cluster.d.ts';
import { authenticateUcanRequest } from '#lib/utils/ucan-utils.server.ts';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const db = getDB();
		const clusterUuid = params.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		const cluster = await getCluster(db, clusterUuid);

		if (!cluster) {
			return json({ error: 'Cluster not found', success: false }, { status: 404 });
		}

		const clusterPublic: ClusterPublic = { ...cluster };

		return json({ data: clusterPublic, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters/*',
			namespace: 'clusters',
			segments: ['PUT']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const clusterUuid = params.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		const cluster = await getCluster(db, clusterUuid);

		if (!cluster) {
			return json({ error: 'Cluster not found', success: false }, { status: 404 });
		}

		const { name, description, centerLat, centerLon, scale } = await request.json();

		const updatedCluster: ClusterDbUpdateInput = {
			name,
			description,
			centerLat,
			centerLon,
			scale,
			updatedAt: Math.floor(new Date().getTime() / 1000)
		};

		const result = await updateCluster(db, clusterUuid, updatedCluster);

		if (result?.meta?.changes === 0) {
			return json({ error: 'Cluster not found', success: false }, { status: 404 });
		}

		return json({ data: null, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing PUT request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters/*',
			namespace: 'clusters',
			segments: ['DELETE']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const clusterUuid = params.cluster_uuid;

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		// Delete the cluster
		const result = await deleteCluster(db, clusterUuid);

		if (result?.meta?.changes === 0) {
			return json({ error: 'Cluster not found', success: false }, { status: 404 });
		}

		// Delete all nodes in the cluster
		await deleteNodes(db, clusterUuid);

		return json({ data: null, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing DELETE request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
