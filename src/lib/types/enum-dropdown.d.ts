export interface DropdownOption {
	value: string;
	label: string;
}

export interface DropdownField {
	field_name: string;
	title: string;
	options: DropdownOption[];
}

export interface SchemaProperty {
	type?: string;
	enum?: string[];
	enumNames?: string[];
	title?: string;
	items?: {
		type?: string;
		enum?: string[];
		enumNames?: string[];
	};
}

export interface SchemaData {
	properties?: Record<string, SchemaProperty>;
}
