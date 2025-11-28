import { request } from '$lib/api/request';
import type {
	SourceIndex,
	SourceIndexInsert,
	SourceIndexUpdateInput
} from '$lib/types/source-index';

export const getSourceIndexes = async (customFetch?: typeof fetch) =>
	request<undefined, SourceIndex[]>('/api/source-indexes', 'GET', undefined, customFetch);

export const getSourceIndexById = async (id: number, customFetch?: typeof fetch) =>
	request<undefined, SourceIndex>(`/api/source-indexes/${id}`, 'GET', undefined, customFetch);

export const createSourceIndex = async (data: SourceIndexInsert, customFetch?: typeof fetch) =>
	request<SourceIndexInsert, SourceIndex>('/api/source-indexes', 'POST', data, customFetch);

export const updateSourceIndex = async (
	id: number,
	data: SourceIndexUpdateInput,
	customFetch?: typeof fetch
) => request<SourceIndexUpdateInput, null>(`/api/source-indexes/${id}`, 'PUT', data, customFetch);

export const deleteSourceIndex = async (id: number, customFetch?: typeof fetch) =>
	request<undefined, null>(`/api/source-indexes/${id}`, 'DELETE', undefined, customFetch);
