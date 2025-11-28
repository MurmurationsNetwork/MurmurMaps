import { refreshToken } from '$lib/api/auth-request';
import { getToken } from '$lib/core';
import { storeToken } from '$lib/core';
import { getOrCreateKeyPair } from '$lib/crypto';
import { signRequest } from '$lib/crypto';
import { exportPublicKey } from '$lib/crypto';
import { currentTokenStore } from '$lib/stores/token-store';
import { delegationsStore, rootTokenStore } from '$lib/stores/token-store';
import type { Meta } from '$lib/types/api';
import type { IndexNodeMeta } from '$lib/types/index-node';
import type { ValidationError } from '$lib/types/profile';
import { compressTokenBrotli } from '$lib/utils/compress-token';
import { issueAccessUcan } from '$lib/utils/ucan-utils';

import { get } from 'svelte/store';

export async function request<TBody, TResponse>(
	url: string,
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
	body?: TBody,
	customFetch: typeof fetch = fetch,
	withCredentials: boolean = true
): Promise<{
	data: TResponse;
	success: boolean;
	message?: string;
	error?: string;
	meta?: Meta | IndexNodeMeta;
	errors?: ValidationError[];
}> {
	let currentToken = get(currentTokenStore);
	if (!currentToken) {
		currentToken = await getToken('currentToken');
	}

	if (currentToken) {
		const compressedToken = compressTokenBrotli(currentToken);
		currentToken = compressedToken;
	}

	try {
		const headers: HeadersInit = {
			'Content-Type': 'application/json'
		};

		if (currentToken) {
			headers['Authorization'] = `Bearer ${currentToken}`;
		}

		const requestBody = body !== undefined ? JSON.stringify(body) : undefined;

		let response = await customFetch(url, {
			method,
			headers,
			body: requestBody,
			credentials: withCredentials ? 'include' : 'omit'
		});

		if (response.status === 401 && typeof window !== 'undefined') {
			console.warn(`[UCAN] 401 detected for ${url}, trying to refresh tokens...`);
			const keypair = await getOrCreateKeyPair();

			const rootToken = await refreshRootToken(keypair);
			if (!rootToken) {
				console.error(`[UCAN] Failed to refresh root token for ${url}`);
				return {
					data: null as unknown as TResponse,
					success: false,
					error: 'Failed to refresh root token'
				};
			}
			const currentToken = await refreshAccessToken(rootToken, keypair);
			const compressedToken = compressTokenBrotli(currentToken);
			headers['Authorization'] = `Bearer ${compressedToken}`;

			response = await customFetch(url, {
				method,
				headers,
				body: requestBody,
				credentials: withCredentials ? 'include' : 'omit'
			});
		}

		const json = await response.json();

		if (!response.ok) {
			return {
				data: null as unknown as TResponse,
				success: false,
				message: json?.message,
				error: json?.error,
				meta: json?.meta,
				errors: json?.errors
			};
		}

		return json;
	} catch (error) {
		console.error(`Error on request to ${url}:`, error);
		throw error;
	}
}

export async function requestRaw<TResponse>(
	url: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
	customFetch: typeof fetch = fetch
): Promise<{
	data: TResponse;
	success: boolean;
}> {
	try {
		const response = await customFetch(url, {
			method
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const json = (await response.json()) as TResponse;

		return {
			data: json,
			success: true
		};
	} catch (error) {
		console.error(`Error on requestRaw to ${url}:`, error);
		throw error;
	}
}

export async function requestWithFormData<TResponse>(
	url: string,
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
	body?: FormData,
	customFetch: typeof fetch = fetch
): Promise<{
	data: TResponse;
	success: boolean;
	message?: string;
	error?: string;
	meta?: Meta;
	errors?: ValidationError[];
}> {
	let currentToken = get(currentTokenStore);
	if (!currentToken) {
		currentToken = await getToken('currentToken');
	}

	if (currentToken) {
		const compressedToken = compressTokenBrotli(currentToken);
		currentToken = compressedToken;
	}

	try {
		const headers: HeadersInit = {};

		if (currentToken) {
			headers['Authorization'] = `Bearer ${currentToken}`;
		}

		const response = await customFetch(url, {
			method,
			headers,
			body
		});

		const json = await response.json();

		if (!response.ok) {
			return {
				data: null as unknown as TResponse,
				success: false,
				message: json?.message,
				error: json?.error,
				meta: json?.meta,
				errors: json?.errors
			};
		}

		return json;
	} catch (error) {
		console.error(`Error on request to ${url}:`, error);
		throw error;
	}
}

export async function refreshRootToken(keypair: CryptoKeyPair): Promise<string | null> {
	try {
		const xTimer = Math.floor(Date.now()).toString();
		const requestBody = '{}';
		const signature = await signRequest(requestBody, keypair.privateKey);
		const xTimerSignature = await signRequest(xTimer, keypair.privateKey);
		const publicKey = await exportPublicKey(keypair.publicKey);

		const { success, data } = await refreshToken(signature, xTimer, xTimerSignature, publicKey);
		if (success && data?.token) {
			rootTokenStore.set(data.token);
			await storeToken('rootToken', data.token);
			return data.token;
		} else {
			console.warn('Root token refresh failed');
			rootTokenStore.set(null);
			currentTokenStore.set(null);
			delegationsStore.set([]);
			return null;
		}
	} catch (err) {
		console.error('Error refreshing root token:', err);
		return null;
	}
}

async function refreshAccessToken(rootToken: string, keypair: CryptoKeyPair): Promise<string> {
	const accessUcan = await issueAccessUcan(rootToken, keypair, 60 * 60);
	currentTokenStore.set(accessUcan);
	await storeToken('currentToken', accessUcan);
	return accessUcan;
}
