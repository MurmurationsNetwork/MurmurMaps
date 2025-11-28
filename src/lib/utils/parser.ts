import type { RetrievedSchema, Schema } from '$lib/types/schema';

export const parseRef = async (
	schemaName: string | string[],
	sourceLibraryUrl: string
): Promise<Schema | null> => {
	const url = `${sourceLibraryUrl}/v2/schemas`;

	const schemaNames = Array.isArray(schemaName)
		? schemaName
		: schemaName.split(',').map((name) => name.trim());

	return await parseSchemas(url, schemaNames);
};

const parseSchemas = async (url: string, schemaNames: string[]): Promise<Schema | null> => {
	if (schemaNames.length === 0) {
		return null;
	}

	try {
		const schemas = await Promise.all(schemaNames.map((name) => retrieveSchema(url, name)));

		// Filter out null values
		const filteredSchemas = schemas.filter((schema) => schema !== null) as RetrievedSchema[];

		if (filteredSchemas.length === 0) {
			return null;
		}

		const mergedSchema: Schema = {
			$schema: filteredSchemas[0].$schema,
			type: 'object',
			properties: {},
			required: [],
			metadata: {
				schema: []
			}
		};

		filteredSchemas.forEach((schema) => {
			Object.assign(mergedSchema.properties, schema.properties);
			mergedSchema.required = Array.from(new Set(mergedSchema.required.concat(schema.required)));
			mergedSchema.metadata.schema.push(schema.metadata.schema.name);
		});

		return mergedSchema;
	} catch (err) {
		console.error(`Schema Parse error: ${err}`);
		throw err;
	}
};

async function retrieveSchema(url: string, schemaName: string): Promise<RetrievedSchema | null> {
	const schemaUrl = `${url}/${schemaName}`;

	try {
		const response = await fetch(schemaUrl);
		if (!response.ok) {
			throw 'Unable to connect to the Library service, please try again in a few minutes';
		}
		return await response.json();
	} catch (err) {
		console.error(`Error fetching schema: ${err}`);
		throw err;
	}
}
