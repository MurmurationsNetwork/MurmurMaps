import { request } from '$lib/api/request';
import type {
	Cluster,
	ClusterCreateInput,
	ClusterPublic,
	ClusterUpdateInput,
	ClusterWithJobUuid
} from '$lib/types/cluster';
import type { DropdownField } from '$lib/types/enum-dropdown';

export const getClusters = async (sourceIndexId?: number, customFetch?: typeof fetch) => {
	if (sourceIndexId) {
		return request<undefined, Cluster[]>(
			`/api/clusters?source_index_id=${sourceIndexId}`,
			'GET',
			undefined,
			customFetch
		);
	}
	return request<undefined, Cluster[]>('/api/clusters', 'GET', undefined, customFetch);
};

export const getCluster = (clusterUuid: string, customFetch?: typeof fetch) =>
	request<undefined, ClusterPublic>(`/api/clusters/${clusterUuid}`, 'GET', undefined, customFetch);

export const createCluster = (input: ClusterCreateInput, customFetch?: typeof fetch) =>
	request<ClusterCreateInput, ClusterWithJobUuid>('/api/clusters', 'POST', input, customFetch);

export const updateCluster = (
	clusterUuid: string,
	input: ClusterUpdateInput,
	customFetch?: typeof fetch
) =>
	request<ClusterUpdateInput, ClusterPublic>(
		`/api/clusters/${clusterUuid}`,
		'PUT',
		input,
		customFetch
	);

export const deleteCluster = (clusterUuid: string, customFetch?: typeof fetch) =>
	request<undefined, undefined>(`/api/clusters/${clusterUuid}`, 'DELETE', undefined, customFetch);

export const getAuthorityMap = (clusterUuid: string, customFetch?: typeof fetch) =>
	request<undefined, string[]>(
		`/api/clusters/${clusterUuid}/authority-map`,
		'GET',
		undefined,
		customFetch
	);

export const updateClusterTimestamp = (
	clusterUuid: string,
	lastUpdated: number,
	customFetch?: typeof fetch
) =>
	request<{ lastUpdated: number }, undefined>(
		`/api/clusters/${clusterUuid}/update-timestamp`,
		'PATCH',
		{ lastUpdated },
		customFetch
	);

export const getEnumsDropdown = (clusterUuid: string, customFetch?: typeof fetch) =>
	request<undefined, DropdownField[]>(
		`/api/clusters/${clusterUuid}/enums-dropdown`,
		'GET',
		undefined,
		customFetch
	);
