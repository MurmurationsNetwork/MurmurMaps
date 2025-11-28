import { request } from '$lib/api/request';
import type { JobPublic } from '$lib/types/job';

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
