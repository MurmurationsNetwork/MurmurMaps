export function isValidBase58btc(str: string): boolean {
	try {
		// Check if the string contains only valid base58btc characters
		return /^[1-9A-HJ-NP-Za-km-z]+$/.test(str);
	} catch {
		return false;
	}
}
