import { jobs } from '$lib/server/db/schema';
import type { JobCreateInput } from '$lib/types/job';
import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function getJobByUuidAndTarget(
	db: DrizzleD1Database,
	jobUuid: string,
	targetType: string,
	targetId: string
) {
	return await db
		.select()
		.from(jobs)
		.where(
			and(eq(jobs.jobUuid, jobUuid), eq(jobs.targetType, targetType), eq(jobs.targetId, targetId))
		)
		.get();
}

export async function createJob(db: DrizzleD1Database, job: JobCreateInput) {
	return await db.insert(jobs).values(job).returning().run();
}
