import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams.entries());
	let searchParams = '';

	const indexUrl = params?.index_url;

	if (!indexUrl) {
		return json({ error: 'Missing index_url', success: false }, { status: 400 });
	}

	if (params?.schema && params.schema !== 'all') {
		searchParams += 'schema=' + params.schema;
	}
	if (params?.name) searchParams += '&name=' + params.name;
	if (params?.tags) searchParams += '&tags=' + params.tags;
	if (params?.primary_url) searchParams += '&primary_url=' + params.primary_url;
	if (params?.last_updated) searchParams += '&last_updated=' + params.last_updated;
	if (params?.lat) searchParams += '&lat=' + params.lat;
	if (params?.lon) searchParams += '&lon=' + params.lon;
	if (params?.range) searchParams += '&range=' + params.range;
	if (params?.locality) searchParams += '&locality=' + params.locality;
	if (params?.region) searchParams += '&region=' + params.region;
	if (params?.country) searchParams += '&country=' + params.country;
	if (params?.status) searchParams += '&status=' + params.status;
	if (params?.page_size) searchParams += '&page_size=' + params.page_size;

	const tags_filter = params?.tags_filter ? params.tags_filter : 'or';
	const tags_exact = params?.tags_exact ? params.tags_exact : 'false';
	searchParams += '&tags_filter=' + tags_filter + '&tags_exact=' + tags_exact;

	if (params?.page) searchParams += '&page=' + params.page;

	try {
		const response = await fetch(`${indexUrl}/v2/nodes?${searchParams}`);
		const data = await response.json();

		if (response.status === 400) {
			return json({ error: data?.errors?.[0]?.detail, success: false }, { status: 400 });
		}

		if (!response.ok && response.status !== 400) {
			return json({ ...data, success: false }, { status: response.status });
		}

		return json(
			{
				data: data?.data,
				meta: data?.meta,
				success: true
			},
			{ status: response.status }
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
		console.error(`Failed to load nodes: ${errorMessage}`);
		return json({ error: `Failed to load nodes: ${errorMessage}` }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const { profile_url: profileUrl, source_index_url: sourceIndexUrl } = await request.json();

	if (!profileUrl) {
		return json({ error: 'Missing profile URL' }, { status: 400 });
	}

	if (!sourceIndexUrl) {
		return json({ error: 'Missing source index URL' }, { status: 400 });
	}

	try {
		const response = await fetch(`${sourceIndexUrl}/v2/nodes-sync`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ profile_url: profileUrl })
		});

		const data = await response.json();
		if (!response.ok) {
			return json(
				{ errors: data.errors || 'Error posting profile to index', success: false },
				{ status: response.status }
			);
		}

		return json({ data: data?.data, success: true }, { status: 200 });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
		console.error(`Failed to post profile to index: ${errorMessage}`);
		return json(
			{ error: 'The index service is currently not available. Please try again in a few minutes.' },
			{ status: 500 }
		);
	}
};
