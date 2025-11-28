import { getCountries } from '$lib/api/countries';
import { getSchemas } from '$lib/api/schemas';
import { getSourceIndexes } from '$lib/api/source-indexes';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const { data: sourceIndexes } = await getSourceIndexes(fetch);

		// Use the first source index as the default
		const defaultSourceIndex = sourceIndexes[0];

		if (!defaultSourceIndex) {
			return {
				title: 'Create a Cluster',
				countries: [],
				schemas: [],
				sourceIndexes: []
			};
		}

		const { data: rawCountries } = await getCountries(
			`${defaultSourceIndex?.libraryUrl}/v2/countries`,
			fetch
		);

		const countries = Object.entries(rawCountries).map(([key, names]) => ({
			value: key,
			// Use the second element as the label if available, otherwise use the first element
			label: Array.isArray(names)
				? (names[1] || names[0])
						.split(' ')
						.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ')
				: ''
		}));

		// Get the schema for the source index
		const { data: allSchemas } = await getSchemas(
			`${defaultSourceIndex?.libraryUrl}/v2/schemas`,
			fetch
		);

		const schemas = allSchemas
			.filter(({ name }) => !name.startsWith('default-v'))
			.filter(({ name }) => !name.startsWith('test_schema-v'))
			.map(({ name }) => ({
				value: name,
				label: name
			}))
			.sort((a, b) => a.label.localeCompare(b.label));

		return {
			title: 'Create a Cluster',
			countries,
			schemas,
			sourceIndexes
		};
	} catch (error) {
		console.error('Error loading cluster creation data:', error);
		return {
			title: 'Create a Cluster',
			countries: [],
			schemas: [],
			sourceIndexes: []
		};
	}
};
