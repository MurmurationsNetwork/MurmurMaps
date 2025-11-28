import { request } from '$lib/api/request';
import type { User, UserWithRoles } from '$lib/types/user';

export const getUser = (customFetch?: typeof fetch) =>
	request<undefined, User>('/api/users', 'GET', undefined, customFetch);

export const getUsers = (customFetch?: typeof fetch) =>
	request<undefined, UserWithRoles[]>('/api/admin/users', 'GET', undefined, customFetch);

export const getUserRoles = (userId: number, customFetch?: typeof fetch) =>
	request<undefined, number[]>(`/api/admin/users/${userId}/roles`, 'GET', undefined, customFetch);

export const updateUserRoles = (userId: number, roleIds: number[], customFetch?: typeof fetch) =>
	request<{ role_ids: number[] }, undefined>(
		`/api/admin/users/${userId}/roles`,
		'POST',
		{ role_ids: roleIds },
		customFetch
	);

export const createUser = (input: { name: string }, customFetch?: typeof fetch) =>
	request<{ name: string }, { public_key: string }>('/api/users', 'POST', input, customFetch);

export const resetEmail = (emailReset: boolean, customFetch?: typeof fetch) =>
	request<{ emailReset: boolean }, undefined>(
		'/api/users/email-reset',
		'PATCH',
		{ emailReset },
		customFetch
	);

export const updateSiteHints = (enableSiteHints: boolean, customFetch?: typeof fetch) =>
	request<{ enableSiteHints: boolean }, undefined>(
		'/api/users/site-hints',
		'PATCH',
		{ enableSiteHints },
		customFetch
	);
