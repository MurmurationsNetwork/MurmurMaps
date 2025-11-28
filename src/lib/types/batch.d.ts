export interface Batch {
	title: string;
	batch_id: string;
	schemas: string[];
	status: string;
	processed_nodes: number;
	total_nodes: number;
}

export interface BatchValidationError {
	status: number;
	source: {
		oid: string;
		pointer: string;
	};
	title: string;
	detail: string;
}
