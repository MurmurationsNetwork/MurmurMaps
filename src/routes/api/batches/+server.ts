import { getDB } from '$lib/server/db';
import { authenticateUcanRequest } from '$lib/utils/ucan-utils.server';
import type { D1Database } from '@cloudflare/workers-types';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request,
	url
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/batches',
			namespace: 'batches',
			segments: ['GET']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		// todo: use last 25 characters of public key as cuid
		const cuid = publicKey.slice(-25);

		const sourceDataProxyUrl = url.searchParams.get('source_data_proxy_url');
		if (!sourceDataProxyUrl) {
			return json({ error: 'Missing source_data_proxy_url', success: false }, { status: 400 });
		}

		const response = await fetch(`${sourceDataProxyUrl}/v1/batch/user?user_id=${cuid}`);

		if (!response.ok) {
			return json(
				{ error: 'Failed to fetch batches data', success: false },
				{ status: response.status }
			);
		}

		const data = await response.json();

		return json({ data: data?.data, success: true });
	} catch (err) {
		console.error(`Error occurred while fetching data: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/batches',
			namespace: 'batches',
			segments: ['POST']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		const schemas = formData.get('schemas');
		const title = formData.get('title');
		const cuid = publicKey.slice(-25);
		const sourceDataProxyUrl = formData.get('source_data_proxy_url') as string;

		formData.append('user_id', cuid);
		formData.append('schemas', '[' + schemas + ']');

		if (!file || !schemas || !title || !cuid) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		if (!sourceDataProxyUrl) {
			return json({ error: 'Missing source_data_proxy_url', success: false }, { status: 400 });
		}

		// Validate the batch import data
		const validationResponse = await validateBatchImport(formData, sourceDataProxyUrl);

		if (validationResponse.status !== 200) {
			return validationResponse;
		}

		const response = await fetch(`${sourceDataProxyUrl}/v1/batch/import`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const res = await response.json();
			if (res.errors) {
				return json({ errors: res.errors, success: false }, { status: response.status });
			}
			return json({ error: 'Failed to import batch', success: false }, { status: response.status });
		}

		const { data, meta } = await response.json();
		return json({ data, meta, success: true });
	} catch (err) {
		console.error(`Error occurred while importing batch: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/batches',
			namespace: 'batches',
			segments: ['PUT']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		const schemas = formData.get('schemas');
		const title = formData.get('title');
		const batchId = formData.get('batch_id');
		const cuid = publicKey.slice(-25);
		const sourceDataProxyUrl = formData.get('source_data_proxy_url') as string;

		formData.append('user_id', cuid);
		formData.append('schemas', '[' + schemas + ']');

		if (!file || !schemas || !title || !batchId || !cuid) {
			return json({ error: 'Missing required fields', success: false }, { status: 400 });
		}

		if (!sourceDataProxyUrl) {
			return json({ error: 'Missing source_data_proxy_url', success: false }, { status: 400 });
		}

		// Validate the batch import data
		const validationResponse = await validateBatchImport(formData, sourceDataProxyUrl);

		if (validationResponse.status !== 200) {
			return validationResponse;
		}

		const response = await fetch(`${sourceDataProxyUrl}/v1/batch/import`, {
			method: 'PUT',
			body: formData
		});

		if (!response.ok) {
			const res = await response.json();
			if (res.errors) {
				return json({ errors: res.errors, success: false }, { status: response.status });
			}
			return json({ error: 'Failed to update batch', success: false }, { status: response.status });
		}

		const { data, meta } = await response.json();
		return json({ data, meta, success: true });
	} catch (err) {
		console.error(`Error occurred while updating batch: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({
	platform = { env: { DB: {} as D1Database } },
	request
}) => {
	try {
		const db = getDB(platform.env);

		const { publicKey, error, status } = await authenticateUcanRequest(db, request, {
			scheme: 'api',
			hierPart: '/batches',
			namespace: 'batches',
			segments: ['DELETE']
		});

		if (!publicKey) {
			return json({ error, success: false }, { status });
		}

		const formData = await request.formData();
		const batchId = formData.get('batch_id');
		const cuid = publicKey.slice(-25);
		const sourceDataProxyUrl = formData.get('source_data_proxy_url') as string;

		if (!sourceDataProxyUrl) {
			return json({ error: 'Missing source_data_proxy_url', success: false }, { status: 400 });
		}

		formData.append('user_id', cuid);

		if (!batchId || !cuid) {
			return json({ error: 'Missing batch_id or user_id', success: false }, { status: 400 });
		}

		const response = await fetch(`${sourceDataProxyUrl}/v1/batch/import`, {
			method: 'DELETE',
			body: formData
		});

		if (!response.ok) {
			const res = await response.json();
			return json(
				{ error: res.message || 'Failed to delete batch', success: false },
				{ status: response.status }
			);
		}

		return json({ message: 'Batch deleted successfully', success: true });
	} catch (err) {
		console.error(`Error occurred while deleting batch: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};

const validateBatchImport = async (
	formData: FormData,
	sourceDataProxyUrl: string
): Promise<Response> => {
	try {
		const response = await fetch(`${sourceDataProxyUrl}/v1/batch/validate`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			if (response.status === 413) {
				return json(
					{ error: 'File size too large. The maximum file size is 8 MB.', success: false },
					{ status: 413 }
				);
			}

			const res = await response.json();
			if (res.errors) {
				return json({ errors: res.errors, success: false }, { status: response.status });
			}
			return json(
				{ error: 'Failed to validate batch', success: false },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json({ data, success: true });
	} catch (err) {
		console.error(`Error occurred while validating batch: ${err}`);
		return json({ error: 'Internal Server Error', success: false }, { status: 500 });
	}
};
