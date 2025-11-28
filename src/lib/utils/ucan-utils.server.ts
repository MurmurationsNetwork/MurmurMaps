import { PRIVATE_SERVER_KEY } from '$env/static/private';
import { getUserIdByPublicKey } from '$lib/server/models/public-key';
import { getPermissionsVersionByUserId } from '$lib/server/models/user';
import type { UcanCapability } from '$lib/types/ucan';
import { decompressTokenBrotli } from '$lib/utils/decompress-token.server';
import {
	getFirstAudienceFromProof,
	isUcanExpired,
	verifyUcanWithCapabilities
} from '$lib/utils/ucan-utils';
import * as ucans from '@ucans/ucans';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

export async function buildUcanWithCapabilities(
	userPublicKey: string,
	lifetimeInSeconds: number,
	capabilities: UcanCapability[],
	permissionsVersion: number
) {
	if (!PRIVATE_SERVER_KEY) {
		throw new Error('Server Private Key is not configured');
	}

	const keypair = ucans.EdKeypair.fromSecretKey(PRIVATE_SERVER_KEY);
	const ucanToken = await ucans.build({
		issuer: keypair,
		audience: 'did:key:z' + userPublicKey,
		lifetimeInSeconds,
		capabilities: capabilities.map((capability) => ({
			with: { scheme: capability.scheme, hierPart: capability.hierPart },
			can: { namespace: capability.namespace, segments: capability.segments }
		})),
		facts: [{ permissionsVersion }]
	});

	return ucans.encode(ucanToken);
}

export async function authenticateUcanRequest(
	db: DrizzleD1Database,
	request: Request,
	capability: UcanCapability
) {
	const compressedToken = request.headers.get('authorization')?.replace('Bearer ', '');
	if (!compressedToken) {
		return { error: 'Unauthorized', status: 401 };
	}

	const ucanToken = decompressTokenBrotli(compressedToken);
	const parsedUcan = ucans.parse(ucanToken);
	if (isUcanExpired(ucanToken)) {
		return { error: 'Token expired', status: 401 };
	}

	const isVerified = await verifyUcanWithCapabilities(
		ucanToken,
		capability.scheme,
		capability.hierPart,
		capability.namespace,
		capability.segments
	);

	if (!isVerified) {
		return { error: 'Permission denied', status: 403 };
	}

	const publicKey = await getFirstAudienceFromProof(ucanToken);
	const userByPublicKey = await getUserIdByPublicKey(db, publicKey);
	if (!userByPublicKey) {
		return { error: 'User not found', status: 404 };
	}
	const permissionsVersion = await getPermissionsVersionByUserId(db, userByPublicKey.userId);

	if (parsedUcan.payload.fct?.find((f) => f.permissionsVersion !== permissionsVersion)) {
		return { error: 'Stale ucan', status: 401 };
	}

	return { publicKey };
}

export function parseUcanDelegation(delegationToken: string) {
	const parsedUcan = ucans.parse(delegationToken);
	const fromDid = parsedUcan.payload.iss;
	const toDid = parsedUcan.payload.aud;
	const expiresAt = parsedUcan.payload.exp || Math.floor(Date.now() / 1000) + 3600;
	const capabilities = parsedUcan.payload.att || [];

	return {
		fromDid,
		toDid,
		expiresAt,
		capabilities
	};
}
