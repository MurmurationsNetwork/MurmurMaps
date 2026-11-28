import { request } from '#lib/api/request.ts';
import type { JobPublic } from '#lib/types/job.d.ts';

export const getJobByUuidAndTarget = (
	clusterUuid: string,
	jobUuid: string,
	customFetch?: typeof fetch
) =>
	request<undefined, JobPublic>(
		`/api/clusters/${clusterUuid}/jobs/${jobUuid}`,
		'GET',
		undefined,
		customFetch
	);
