import { request, requestWithFormData } from '$lib/api/request';
import type { Batch } from '$lib/types/batch';

export const getBatches = (sourceDataProxyUrl: string, customFetch?: typeof fetch) =>
	request<undefined, Batch[]>(
		`/api/batches?source_data_proxy_url=${encodeURIComponent(sourceDataProxyUrl)}`,
		'GET',
		undefined,
		customFetch,
		false
	);

export const createBatch = (formData: FormData, customFetch?: typeof fetch) =>
	requestWithFormData<undefined>(`/api/batches`, 'POST', formData, customFetch);

export const updateBatch = (formData: FormData, customFetch?: typeof fetch) =>
	requestWithFormData<undefined>(`/api/batches`, 'PUT', formData, customFetch);

export const deleteBatch = (formData: FormData, customFetch?: typeof fetch) =>
	requestWithFormData<undefined>(`/api/batches`, 'DELETE', formData, customFetch);
