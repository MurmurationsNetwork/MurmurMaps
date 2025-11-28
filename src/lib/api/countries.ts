import { requestRaw } from '$lib/api/request';

export const getCountries = (url: string, customFetch?: typeof fetch) =>
	requestRaw<Record<string, string[]>>(url, 'GET', customFetch);
