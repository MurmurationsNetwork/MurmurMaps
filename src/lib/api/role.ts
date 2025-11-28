import { request } from '$lib/api/request';
import type { Role, RoleCreateInput } from '$lib/types/role';

export const getRoles = (customFetch?: typeof fetch) =>
	request<undefined, Role[]>('/api/admin/roles', 'GET', undefined, customFetch);

export const getRoleCapabilities = (roleId: number, customFetch?: typeof fetch) =>
	request<undefined, number[]>(
		`/api/admin/roles/${roleId}/capabilities`,
		'GET',
		undefined,
		customFetch
	);

export const updateRoleCapabilities = (
	roleId: number,
	capabilityIds: number[],
	customFetch?: typeof fetch
) =>
	request<{ capability_ids: number[] }, undefined>(
		`/api/admin/roles/${roleId}/capabilities`,
		'POST',
		{ capability_ids: capabilityIds },
		customFetch
	);

export const createRole = (input: RoleCreateInput, customFetch?: typeof fetch) =>
	request<RoleCreateInput, undefined>('/api/admin/roles', 'POST', input, customFetch);
