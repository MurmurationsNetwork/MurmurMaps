export type IndexNode = {
	primary_url: string;
	name: string;
	profile_url: string;
	last_updated: number;
	tags: string[];
	locality: string;
	region: string;
	country: string;
};

export type IndexNodeMeta = {
	message: string;
	number_of_results: number;
	total_pages: number;
};
