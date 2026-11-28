import { getDB } from '#lib/server/db/index.ts';
import { createJob } from '#lib/server/models/job.ts';
import type { JobCreateInput } from '#lib/types/job.d.ts';
import { authenticateUcanRequest } from '#lib/utils/ucan-utils.server.ts';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const db = getDB();

		const {
			publicKey,
			error,
			status: ucanStatus
		} = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/clusters/*/nodes/status',
			namespace: 'clusters',
			segments: ['PUT']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status: ucanStatus });
		}

		const clusterUuid = params.cluster_uuid;
		const { status, node_ids } = await request.json();

		if (!clusterUuid) {
			return json({ error: 'Missing cluster_uuid', success: false }, { status: 400 });
		}

		if (!Array.isArray(node_ids) || node_ids.length === 0) {
			return json({ error: 'node_ids must be a non-empty array', success: false }, { status: 400 });
		}

		if (!status) {
			return json({ error: 'Missing status', success: false }, { status: 400 });
		}

		const jobUuid = crypto.randomUUID();
		const job: JobCreateInput = {
			jobUuid,
			type: 'update-node-statuses',
			targetId: clusterUuid,
			targetType: 'clusters',
			payload: JSON.stringify({ node_ids, status })
		};

		await createJob(db, job);

		await env.JOB_QUEUE.send({
			job_uuid: job.jobUuid,
			type: job.type,
			target_id: job.targetId,
			target_type: job.targetType
		});

		return json({ data: { jobUuid }, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error processing PUT request:', error);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
