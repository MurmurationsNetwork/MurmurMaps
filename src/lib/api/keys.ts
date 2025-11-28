import { request } from '$lib/api/request';
import type { PublicKey } from '$lib/types/public-key';

export const getPublicKeys = (customFetch?: typeof fetch) =>
	request<undefined, { publicKeys: PublicKey[]; currentPublicKey: string }>(
		'/api/keys',
		'GET',
		undefined,
		customFetch
	);

export const linkPublicKey = (token: string, publicKey: string, customFetch?: typeof fetch) =>
	request<{ token: string; publicKey: string }, { publicKey: string }>(
		'/api/keys',
		'POST',
		{ token, publicKey },
		customFetch
	);

export const deletePublicKey = (publicKey: string, customFetch?: typeof fetch) =>
	request<{ publicKey: string }, undefined>('/api/keys', 'DELETE', { publicKey }, customFetch);
