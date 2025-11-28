import { getDB } from '$lib/server/db';
import { createCluster, getClusters } from '$lib/server/models/cluster';
import { createJob } from '$lib/server/models/job';
import type { ClusterInsert, ClusterPublic, ClusterWithJobUuid } from '$lib/types/cluster';
import type { JobCreateInput } from '$lib/types/job';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	url
}) => {
	try {
		const db = getDB(platform.env);
		const sourceIndexId = url.searchParams.get('source_index_id');

		const clusterData = await getClusters(db, sourceIndexId ? parseInt(sourceIndexId) : undefined);

		const clusters: ClusterPublic[] = clusterData as ClusterPublic[];

		return json({ data: clusters, success: true }, { status: 200 });
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
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters',
			namespace: 'clusters',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const body = await request.json();
		const { name, description, indexUrl, queryUrl, centerLat, centerLon, scale, sourceIndexId } =
			body;

		if (!name || !indexUrl || !queryUrl) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		const cluster: ClusterInsert = {
			clusterUuid: crypto.randomUUID(),
			name,
			description,
			indexUrl,
			queryUrl,
			centerLat,
			centerLon,
			scale,
			sourceIndexId
		};

		await createCluster(db, cluster);

		const jobUuid = crypto.randomUUID();
		const job: JobCreateInput = {
			jobUuid,
			type: 'create-nodes',
			targetId: cluster.clusterUuid,
			targetType: 'clusters'
		};

		await createJob(db, job);

		await platform.env.JOB_QUEUE.send({
			job_uuid: job.jobUuid,
			type: job.type,
			target_id: job.targetId,
			target_type: job.targetType
		});

		const clusterWithJobUuid: ClusterWithJobUuid = {
			...cluster,
			jobUuid
		};

		return json({ data: clusterWithJobUuid, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing POST request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
