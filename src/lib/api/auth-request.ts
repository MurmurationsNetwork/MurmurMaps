async function makeAuthenticatedRequest(
	endpoint: string,
	signature: string,
	xTimer: string,
	xTimerSignature: string,
	publicKey: string,
	body?: object
): Promise<{
	data: { token: string };
	success: boolean;
	error?: string;
}> {
	try {
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			'X-Timer': xTimer,
			'X-Timer-Signature': xTimerSignature,
			'X-Signature': signature,
			'X-Public-Key': publicKey
		};

		const requestOptions: RequestInit = {
			method: 'POST',
			headers,
			body: JSON.stringify(body || {})
		};

		const response = await fetch(endpoint, requestOptions);
		const json = await response.json();

		if (!response.ok) {
			return {
				data: null as unknown as { token: string },
				error: json.error,
				success: false
			};
		}

		return json;
	} catch (error) {
		console.error(`Error on ${endpoint} request:`, error);
		return {
			data: null as unknown as { token: string },
			success: false,
			error: error instanceof Error ? error.message : 'An unknown error occurred'
		};
	}
}

export async function register(
	name: string,
	signature: string,
	xTimer: string,
	xTimerSignature: string,
	publicKey: string
): Promise<{
	data: { token: string };
	success: boolean;
	error?: string;
}> {
	return makeAuthenticatedRequest('/api/register', signature, xTimer, xTimerSignature, publicKey, {
		name
	});
}

export async function refreshToken(
	signature: string,
	xTimer: string,
	xTimerSignature: string,
	publicKey: string
): Promise<{
	data: { token: string };
	success: boolean;
	error?: string;
}> {
	return makeAuthenticatedRequest(
		'/api/refresh-token',
		signature,
		xTimer,
		xTimerSignature,
		publicKey,
		undefined
	);
}
