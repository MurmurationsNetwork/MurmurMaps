import {
	issueAccessUcan,
	isUcanChainExpired,
	isUcanExpired,
	toDidableKey
} from '#lib/utils/ucan-utils.ts';
import * as ucans from '@ucans/ucans';
import { describe, expect, it } from 'vitest';

describe('UCAN expiration', () => {
	it('does not issue an access token that outlives its proof', async () => {
		const proofIssuer = await ucans.EdKeypair.create();
		const userKeyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
			'sign',
			'verify'
		])) as CryptoKeyPair;
		const userKey = await toDidableKey(userKeyPair);
		const proofExpiration = Math.floor(Date.now() / 1000) + 60;
		const proof = await ucans.build({
			issuer: proofIssuer,
			audience: userKey.did(),
			expiration: proofExpiration
		});

		const accessToken = await issueAccessUcan(ucans.encode(proof), userKeyPair, 60 * 60);

		expect(ucans.parse(accessToken).payload.exp).toBe(proofExpiration);
	});

	it('treats an unexpired token with an expired proof as expired', async () => {
		const rootIssuer = await ucans.EdKeypair.create();
		const delegateIssuer = await ucans.EdKeypair.create();
		const now = Math.floor(Date.now() / 1000);
		const expiredProof = await ucans.build({
			issuer: rootIssuer,
			audience: delegateIssuer.did(),
			expiration: now - 1
		});
		const accessToken = await ucans.build({
			issuer: delegateIssuer,
			audience: rootIssuer.did(),
			expiration: now + 60,
			proofs: [ucans.encode(expiredProof)]
		});
		const encodedAccessToken = ucans.encode(accessToken);

		expect(isUcanExpired(encodedAccessToken)).toBe(false);
		expect(isUcanChainExpired(encodedAccessToken)).toBe(true);
	});

	it('accepts a proof chain when every token is unexpired', async () => {
		const rootIssuer = await ucans.EdKeypair.create();
		const delegateIssuer = await ucans.EdKeypair.create();
		const now = Math.floor(Date.now() / 1000);
		const proof = await ucans.build({
			issuer: rootIssuer,
			audience: delegateIssuer.did(),
			expiration: now + 120
		});
		const accessToken = await ucans.build({
			issuer: delegateIssuer,
			audience: rootIssuer.did(),
			expiration: now + 60,
			proofs: [ucans.encode(proof)]
		});

		expect(isUcanChainExpired(ucans.encode(accessToken))).toBe(false);
	});
});
