import { inflateSync } from 'zlib';

function base64urlToBuffer(base64url: string): Buffer {
	let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	while (base64.length % 4 !== 0) base64 += '=';
	return Buffer.from(base64, 'base64');
}

export function decompressTokenBrotli(encoded: string): string {
	const buf = base64urlToBuffer(encoded);
	return inflateSync(buf).toString('utf-8');
}
