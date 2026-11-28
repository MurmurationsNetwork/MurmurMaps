import { getDB } from '#lib/server/db/index.ts';
import { getJobByUuidAndTarget } from '#lib/server/models/job.ts';
import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { cluster_uuid, job_uuid } = params;

	try {
		const db = getDB();
		const job = await getJobByUuidAndTarget(db, job_uuid, 'clusters', cluster_uuid);

		return json({ data: job, success: true }, { status: 200 });
	} catch (error) {
		console.error('Error fetching job:', error);
		return json({ error: 'Failed to fetch job', success: false }, { status: 500 });
	}
};
