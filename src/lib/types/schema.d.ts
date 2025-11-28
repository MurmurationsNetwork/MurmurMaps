export type BasicSchema = {
	title: string;
	description: string;
	name: string;
	url: string;
};

export type Schema = {
	$schema: string;
	type: string;
	properties: { [key: string]: Field };
	required: string[];
	metadata: {
		schema: string[];
	};
};

export interface RetrievedSchema extends Omit<Schema, 'metadata'> {
	metadata: {
		schema: {
			name: string;
		};
	};
}

export type Field = {
	type: 'string' | 'number' | 'array' | 'object' | 'boolean';
	title?: string;
	description?: string;
	enum?: string[];
	enumNames?: string[];
	properties?: Record<string, Field>;
	items?: Field;
	required?: string[];
	maxLength?: number;
	pattern?: string;
	minimum?: number;
	maximum?: number;
};
