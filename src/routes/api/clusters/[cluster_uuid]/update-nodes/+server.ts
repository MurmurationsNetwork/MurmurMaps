import { getDB } from '#lib/server/db/index.ts';
import { getCluster } from '#lib/server/models/cluster.ts';
import { createJob } from '#lib/server/models/job.ts';
import {
	cleanDeletedNodes,
	getDeletedProfilesFromJobResult,
	getProfileListFromJobResult,
	getUnauthoritativeProfilesFromJobResult
} from '#lib/server/models/node.ts';
import type { ClusterWithJobUuid } from '#lib/types/cluster.d.ts';
import type { JobCreateInput } from '#lib/types/job.d.ts';
import { fetchProfiles } from '#lib/utils/profile.ts';
import { authenticateUcanRequest } from '#lib/utils/ucan-utils.server.ts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters/*/update-nodes',
			namespace: 'clusters',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const clusterUuid = params.cluster_uuid;
		const url = new URL(request.url);
		const jobUuid = url.searchParams.get('job_uuid');

		if (!clusterUuid || !jobUuid) {
			return json({ error: 'Missing cluster_uuid or job_uuid', success: false }, { status: 400 });
		}

		const profileList = await getProfileListFromJobResult(db, clusterUuid, jobUuid);
		const deletedProfiles = await getDeletedProfilesFromJobResult(db, clusterUuid, jobUuid);
		const unauthoritativeProfiles = await getUnauthoritativeProfilesFromJobResult(
			db,
			clusterUuid,
			jobUuid
		);

		const jobResult = {
			profileList,
			deletedProfiles,
			unauthoritativeProfiles
		};

		await cleanDeletedNodes(db, clusterUuid);

		return json({ data: jobResult, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing GET request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters/*/update-nodes',
			namespace: 'clusters',
			segments: ['POST']
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

		// Check if the cluster has more than 500 nodes
		const { meta } = await fetchProfiles(cluster.indexUrl, cluster.queryUrl);
		if (meta?.total_pages > 1) {
			return json(
				{
					error:
						'Too many nodes after update (over 500). Please delete this cluster and create a new one with narrower search parameters.',
					success: false
				},
				{ status: 400 }
			);
		}

		const jobUuid = crypto.randomUUID();
		const job: JobCreateInput = {
			jobUuid,
			type: 'update-nodes',
			targetId: cluster.clusterUuid,
			targetType: 'clusters'
		};

		await createJob(db, job);

		await env.JOB_QUEUE.send({
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
