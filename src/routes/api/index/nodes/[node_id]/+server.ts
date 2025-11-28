import { PUBLIC_TOOLS_URL } from '$env/static/public';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { node_id } = params;
		if (!node_id) {
			return json({ error: 'Missing node_id', success: false }, { status: 400 });
		}

		const source_index_url = url.searchParams.get('source_index_url');
		if (!source_index_url) {
			return json({ error: 'Missing source_index_url', success: false }, { status: 400 });
		}

		const response = await fetch(`${source_index_url}/v2/nodes/${node_id}`);

		const data = await response.json();
		if (!response.ok) {
			return json(
				{ errors: data.errors || 'Error fetching status from index', success: false },
				{ status: response.status }
			);
		}

		return json({ data: data.data, success: true }, { status: 200 });
	} catch (err) {
		console.error('Error fetching status:', err);
		return json(
			{
				error: 'Unable to connect to the Index service, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { node_id } = params;

		if (!node_id) {
			return json({ error: 'Missing node_id', success: false }, { status: 400 });
		}

		const { source_index_url: sourceIndexUrl } = await request.json();

		if (!sourceIndexUrl) {
			return json({ error: 'Missing source_index_url', success: false }, { status: 400 });
		}

		const profileUrl = `${PUBLIC_TOOLS_URL}/profiles/${node_id}`;

		const response = await fetch(`${sourceIndexUrl}/v2/nodes`, {
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
		console.error('Error posting profile to index:', err);
		return json(
			{
				error: 'Unable to connect to the Index service, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const { node_id } = params;

		if (!node_id) {
			return json({ error: 'Missing node_id', success: false }, { status: 400 });
		}

		const { source_index_url: sourceIndexUrl } = await request.json();
		if (!sourceIndexUrl) {
			return json({ error: 'Missing source_index_url', success: false }, { status: 400 });
		}

		const response = await fetch(`${sourceIndexUrl}/v2/nodes/${node_id}`, {
			method: 'DELETE'
		});

		const data = await response.json();
		if (!response.ok) {
			return json(
				{ errors: data.errors || 'Error deleting profile from index', success: false },
				{ status: response.status }
			);
		}

		return json({ success: true, message: 'Profile successfully deleted from index' });
	} catch (err) {
		console.error('Error deleting profile from index:', err);
		return json(
			{
				error: 'Unable to connect to the Index service, please try again in a few minutes',
				success: false
			},
			{ status: 500 }
		);
	}
};
