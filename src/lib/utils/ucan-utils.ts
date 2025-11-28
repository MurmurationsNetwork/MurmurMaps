import { PUBLIC_SERVER_DID_KEY } from '$env/static/public';
import { removeDidPrefix } from '$lib/crypto';
import type { CryptoKeyPair } from '$lib/types/crypto';
import type { Delegation } from '$lib/types/delegation';
import type { DidableKey } from '@ucans/ucans';
import * as ucans from '@ucans/ucans';
import * as uint8arrays from 'uint8arrays';

export async function toDidableKey(keypair: CryptoKeyPair): Promise<DidableKey> {
	const publicKey = keypair.publicKey;
	const privateKey = keypair.privateKey;

	const publicKeyBytes = await crypto.subtle.exportKey('raw', publicKey);
	const did = publicKeyToDid(new Uint8Array(publicKeyBytes));

	return {
		jwtAlg: 'EdDSA',
		sign: async (data: Uint8Array) => {
			const buffer: ArrayBuffer =
				data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
					? (data.buffer as ArrayBuffer)
					: data.slice().buffer;
			const sig = await crypto.subtle.sign({ name: 'Ed25519' }, privateKey, buffer);
			return new Uint8Array(sig);
		},
		did: () => did
	};
}

export const EDWARDS_DID_PREFIX = new Uint8Array([0xed, 0x01]);

export const publicKeyToDid = (pubkey: Uint8Array): string => {
	return didFromKeyBytes(pubkey, EDWARDS_DID_PREFIX);
};

export function didFromKeyBytes(publicKeyBytes: Uint8Array, prefix: Uint8Array): string {
	const bytes = uint8arrays.concat([prefix, publicKeyBytes]);
	const base58Key = uint8arrays.toString(bytes, 'base58btc');
	return 'did:key:z' + base58Key;
}

export async function issueAccessUcan(
	currentToken: string,
	userKeyPair: CryptoKeyPair,
	lifetimeInSeconds: number
): Promise<string> {
	const didableKey = await toDidableKey(userKeyPair);
	const currentUcan = ucans.parse(currentToken);

	const ucanToken = await ucans.build({
		issuer: didableKey,
		audience: PUBLIC_SERVER_DID_KEY,
		lifetimeInSeconds,
		capabilities: currentUcan.payload.att,
		facts: currentUcan.payload.fct,
		proofs: [currentToken]
	});

	return ucans.encode(ucanToken);
}

export async function verifyUcanWithCapabilities(
	encodedUcan: string,
	scheme: string,
	hierPart: string,
	namespace: string,
	segments: string[]
): Promise<boolean> {
	const rootIssuerDidKey = PUBLIC_SERVER_DID_KEY;

	const result = await ucans.verify(encodedUcan, {
		audience: PUBLIC_SERVER_DID_KEY,
		requiredCapabilities: [
			{
				capability: {
					with: { scheme, hierPart },
					can: { namespace, segments }
				},
				rootIssuer: rootIssuerDidKey
			}
		]
	});

	if (result.ok) {
		return true;
	} else {
		console.log('verifyUcanWithCapabilities - Verification failed:', result?.error);
		return false;
	}
}

export function isUcanExpired(encodedUcan: string): boolean {
	try {
		const ucan = ucans.parse(encodedUcan);
		const now = Math.floor(Date.now() / 1000);
		return ucan.payload.exp < now;
	} catch (error) {
		console.error('Error parsing UCAN:', error);
		return true;
	}
}

export async function getFirstAudienceFromProof(encodedUcan: string): Promise<string> {
	let currentUcan = ucans.parse(encodedUcan);

	while (currentUcan.payload.prf && currentUcan.payload.prf.length > 0) {
		const proof = currentUcan.payload.prf[0];
		currentUcan = ucans.parse(proof);
	}

	return removeDidPrefix(currentUcan.payload.aud.toString());
}

export async function decodeUcanToDelegation(encodedUcan: string): Promise<Delegation> {
	const ucan = ucans.parse(encodedUcan);

	if (ucan.payload.exp < Math.floor(Date.now() / 1000)) {
		throw new Error('Ucan has expired');
	}

	return {
		from: removeDidPrefix(ucan.payload.iss.toString()),
		token: encodedUcan,
		expiresAt: ucan.payload.exp
	};
}

export function checkAdminCapability(currentToken: string | null): boolean {
	if (!currentToken) {
		return false;
	}

	const payload = ucans.parse(currentToken);
	const caps = payload.payload.att || [];

	return caps.some((cap) => {
		return (
			cap.with?.scheme === 'page' && typeof cap.can === 'object' && cap.can.namespace === 'admin'
		);
	});
}
