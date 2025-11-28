import { deflate } from 'pako';

export function compressTokenBrotli(token: string): string {
	const compressed = deflate(token);
	return base64url(compressed);
}

function base64url(input: Uint8Array): string {
	let bin = '';
	input.forEach((byte) => (bin += String.fromCharCode(byte)));
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
