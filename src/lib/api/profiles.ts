import { request } from '$lib/api/request';
import type {
	Profile,
	ProfileCreateInput,
	ProfileObject,
	ProfileUpdateInput
} from '$lib/types/profile';

export const validateProfile = (
	profile: ProfileObject,
	sourceIndexUrl: string,
	customFetch?: typeof fetch
) =>
	request<ProfileObject, undefined>(
		`${sourceIndexUrl}/v2/validate`,
		'POST',
		profile,
		customFetch,
		false
	);

export const getIndexStatus = (
	nodeId: string,
	sourceIndexUrl: string,
	customFetch?: typeof fetch
) =>
	request<undefined, { status: string }>(
		`/api/index/nodes/${nodeId}?source_index_url=${encodeURIComponent(sourceIndexUrl)}`,
		'GET',
		undefined,
		customFetch,
		false
	);

export const postProfileToIndex = (
	cuid: string,
	sourceIndexUrl: string,
	customFetch?: typeof fetch
) =>
	request<{ source_index_url: string }, { node_id: string }>(
		`/api/index/nodes/${cuid}`,
		'POST',
		{ source_index_url: sourceIndexUrl },
		customFetch,
		false
	);

export const postIndex = (profileUrl: string, sourceIndexUrl: string, customFetch?: typeof fetch) =>
	request<{ profile_url: string; source_index_url: string }, { node_id: string }>(
		`/api/index/nodes`,
		'POST',
		{ profile_url: profileUrl, source_index_url: sourceIndexUrl },
		customFetch,
		false
	);

export const deleteIndex = (nodeId: string, sourceIndexUrl: string, customFetch?: typeof fetch) =>
	request<{ source_index_url: string }, undefined>(
		`/api/index/nodes/${nodeId}`,
		'DELETE',
		{ source_index_url: sourceIndexUrl },
		customFetch,
		false
	);

export const getProfiles = (sourceIndexId: number, customFetch?: typeof fetch) =>
	request<undefined, Profile[]>(
		`/api/profiles?source_index_id=${sourceIndexId}`,
		'GET',
		undefined,
		customFetch
	);

export const getProfile = (cuid: string, customFetch?: typeof fetch) =>
	request<undefined, Profile>(`/api/profiles/${cuid}`, 'GET', undefined, customFetch);

export const createProfile = (profile: ProfileCreateInput, customFetch?: typeof fetch) =>
	request<ProfileCreateInput, Profile>(`/api/profiles`, 'POST', profile, customFetch);

export const updateProfile = (
	cuid: string,
	profile: ProfileUpdateInput,
	customFetch?: typeof fetch
) => request<ProfileUpdateInput, Profile>(`/api/profiles/${cuid}`, 'PATCH', profile, customFetch);

export const updateProfileNodeId = (cuid: string, nodeId: string, customFetch?: typeof fetch) =>
	request<{ node_id: string }, undefined>(
		`/api/profiles/${cuid}/update-node-id`,
		'PUT',
		{ node_id: nodeId },
		customFetch
	);

export const deleteProfile = (cuid: string, customFetch?: typeof fetch) =>
	request<undefined, undefined>(`/api/profiles/${cuid}`, 'DELETE', undefined, customFetch);
