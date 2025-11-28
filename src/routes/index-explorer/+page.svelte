<script lang="ts">
	import { pushState } from '$app/navigation';
	import { getCountries } from '$lib/api/countries';
	import { getIndexNodes } from '$lib/api/index-node';
	import { getSchemas } from '$lib/api/schemas';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import type { IndexNode, IndexNodeMeta } from '$lib/types/index-node';
	import type { IndexSearchParams } from '$lib/types/index-search-params';
	import { formatDate } from '$lib/utils/date';
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';

	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { MediaQuery } from 'svelte/reactivity';

	import type { PageData } from './$types';
	import SortableColumn from './SortableColumn.svelte';

	let { data }: { data: PageData } = $props();

	let sortedNodes: IndexNode[] = $state([]);
	let meta: IndexNodeMeta = $state({
		message: '',
		number_of_results: 0,
		total_pages: 0
	});
	let page: number = $state(1);
	let pageSize: number = $state(30);
	let searchParamsObj: IndexSearchParams = $state({
		schema: '',
		name: '',
		tags: '',
		primary_url: '',
		last_updated: '',
		lat: '',
		lon: '',
		range: '',
		locality: '',
		region: '',
		country: '',
		status: '',
		tags_filter: 'or',
		tags_exact: 'false',
		page_size: '30',
		page: '1'
	});
	let searchParams: URLSearchParams = $state(data.loadSearchParams);
	let isLoading: boolean = $state(false);
	let tagsFilterChecked: boolean = $state(false);
	let tagsExactChecked: boolean = $state(false);
	let sortProp: string = $state('');
	let sortOrder: 'asc' | 'desc' | null = $state(null);
	let schemasList: { value: string; label: string }[] = $state([]);
	let countries: string[] = $state([]);
	let sourceIndexUrl: string = $state('');

	const isDesktop = new MediaQuery('(min-width: 768px)');

	// Derived values for select components
	const schemaOptions = $derived([
		{ value: '', label: 'Select a schema' },
		{ value: 'all', label: 'All schemas' },
		...schemasList
	]);

	const countryOptions = $derived([
		{ value: '', label: 'Select a Country' },
		...countries.map((country) => ({ value: country, label: country }))
	]);

	const statusOptions = $derived([
		{ value: '', label: 'Select a Status (default: all)' },
		{ value: 'posted', label: 'posted' },
		{ value: 'deleted', label: 'deleted' }
	]);

	const pageSizeOptions = $derived([
		{ value: '30', label: 'Select the Page Size (default: 30)' },
		{ value: '100', label: '100' },
		{ value: '500', label: '500' }
	]);

	const schemaTriggerContent = $derived(
		schemaOptions.find((s) => s.value === searchParamsObj.schema)?.label ?? 'Select a schema'
	);

	const countryTriggerContent = $derived(
		countryOptions.find((c) => c.value === searchParamsObj.country)?.label ?? 'Select a Country'
	);

	const statusTriggerContent = $derived(
		statusOptions.find((s) => s.value === searchParamsObj.status)?.label ??
			'Select a Status (default: all)'
	);

	const pageSizeTriggerContent = $derived(
		pageSizeOptions.find((p) => p.value === searchParamsObj.page_size)?.label ??
			'Select the Page Size (default: 30)'
	);

	const siblingCount = $derived(isDesktop.current ? 1 : 0);

	onMount(async () => {
		if ($sourceIndexStore) {
			await loadInitialData();
		} else {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		if (searchParams.toString()) {
			await performSearch();
		}
	});

	async function loadInitialData() {
		const sourceIndexId = $sourceIndexStore;

		if (!sourceIndexId) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		const src = data.sourceIndexes.find((s) => s.id === sourceIndexId);

		if (!src) {
			toast.error('Invalid Source Index.');
			return;
		}

		const libraryUrl = src.libraryUrl;
		sourceIndexUrl = src.url;

		try {
			// schemas
			const { data: schemas } = await getSchemas(`${libraryUrl}/v2/schemas`);
			schemasList = schemas
				.filter(({ name }) => !name.startsWith('default-v'))
				.filter(({ name }) => !name.startsWith('test_schema-v'))
				.map(({ name }) => ({
					value: name,
					label: name
				}))
				.sort((a, b) => a.label.localeCompare(b.label));

			// countries
			const { data: rawCountries } = await getCountries(`${libraryUrl}/v2/countries`, fetch);
			countries = Object.keys(rawCountries);
		} catch (err) {
			console.error(err);
			toast.error('Failed to load schemas/countries from the selected Source Index.');
		}
	}

	// When the source index changes, load the initial data
	$effect(() => {
		const id = $sourceIndexStore;
		if (!id) return;

		queueMicrotask(async () => {
			await loadInitialData();

			searchParams = new SvelteURLSearchParams();
			searchParamsObj = {
				schema: '',
				name: '',
				tags: '',
				primary_url: '',
				last_updated: '',
				lat: '',
				lon: '',
				range: '',
				locality: '',
				region: '',
				country: '',
				status: '',
				tags_filter: 'or',
				tags_exact: 'false',
				page_size: '30',
				page: '1'
			};

			sortedNodes = [];
			meta = {
				message: '',
				number_of_results: 0,
				total_pages: 0
			};

			pushState(window.location.pathname, '');
		});
	});

	async function performSearch(): Promise<void> {
		isLoading = true;

		for (const [key] of Object.entries(searchParamsObj)) {
			if (searchParams.has(key) && searchParams.get(key)) {
				if (key === 'last_updated') {
					searchParamsObj[key as keyof IndexSearchParams] = new Date(
						parseInt(searchParams.get(key) as string) * 1000
					)
						.toISOString()
						.slice(0, 16);
				} else {
					searchParamsObj[key as keyof IndexSearchParams] = searchParams.get(key) as string;
				}
			}
		}

		if (!searchParamsObj.schema && searchParams.toString()) {
			toast.error('The schema is required');
			isLoading = false;
			return;
		}

		// Set the tags filter and exact checked states
		tagsFilterChecked = searchParamsObj.tags_filter === 'and';
		tagsExactChecked = searchParamsObj.tags_exact === 'true';

		// Set the page and page size
		page = searchParams.has('page') ? parseInt(searchParams.get('page') as string) : 1;
		pageSize = searchParams.has('page_size')
			? parseInt(searchParams.get('page_size') as string)
			: 30;

		// Wait for the route to update, prevent the error at the upcoming pushState
		await tick();

		// Update the URL with the current search parameters
		const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
		pushState(newUrl, '');

		// Add index_url to the search params
		if (sourceIndexUrl === '') {
			toast.error('Source index URL is not available');
			isLoading = false;
			return;
		}
		searchParams.append('index_url', sourceIndexUrl);

		const {
			data: response,
			success,
			error: errorMessage,
			meta: metaResponse
		} = await getIndexNodes(searchParams.toString());

		if (success) {
			sortedNodes = Array.isArray(response) ? response : [];
			meta = (metaResponse as IndexNodeMeta) ?? {
				message: '',
				number_of_results: 0,
				total_pages: 0
			};
		} else {
			toast.error('Error fetching data: ' + errorMessage);
		}
		isLoading = false;
	}

	async function handleSearch(event: Event): Promise<void> {
		event.preventDefault();
		isLoading = true;
		searchParams = new SvelteURLSearchParams();

		for (const [key, value] of Object.entries(searchParamsObj)) {
			if (value) {
				if (key === 'last_updated') {
					searchParams.append(key, (new Date(value).valueOf() / 1000).toString());
				} else {
					searchParams.append(key, value.toString());
				}
			} else {
				searchParams.delete(key);
			}
		}

		// If we are performing a new search, set the page to 1
		searchParams.delete('page');
		searchParams.set('page', '1');

		await performSearch();
	}

	function handleSort(key: string, order: 'asc' | 'desc'): void {
		sortProp = key;
		sortOrder = order;

		if (sortProp && sortProp !== 'tags') {
			sortedNodes = [...sortedNodes].sort((a, b) => {
				if (sortProp === 'last_updated') {
					return sortOrder === 'desc'
						? new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
						: new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime();
				}
				if (
					typeof a[sortProp as keyof IndexNode] === 'string' &&
					typeof b[sortProp as keyof IndexNode] === 'string'
				) {
					return sortOrder === 'desc'
						? (b[sortProp as keyof IndexNode] as string)?.localeCompare(
								a[sortProp as keyof IndexNode] as string
							)
						: (a[sortProp as keyof IndexNode] as string)?.localeCompare(
								b[sortProp as keyof IndexNode] as string
							);
				}
				return 0;
			});
		}
	}

	function handlePageChange(pageValue: number): void {
		if (pageValue < 1 || (meta && pageValue > meta.total_pages)) {
			return;
		}
		page = pageValue;
		searchParams.set('page', pageValue.toString());
		performSearch();
	}
</script>

<div class="container mx-auto p-4">
	<div class="mb-4 sm:flex sm:items-center">
		<div class="text-gray-900 sm:flex-auto dark:text-gray-50">
			<p>
				&nbsp;
				<a
					class="text-primary-500"
					target="_blank"
					rel="noreferrer"
					href="https://docs.murmurations.network/guides/view-the-data.html#search-the-index"
				>
					See our documentation
				</a>
				for a description of the input fields below.
			</p>
		</div>
	</div>
	<div class="card p-4 variant-ghost-primary mb-2 border-2 border-gray-200 rounded-lg">
		<form onsubmit={handleSearch} class="space-y-4">
			<!-- Schema Selection -->
			<div>
				<Select.Root type="single" name="schema" bind:value={searchParamsObj.schema}>
					<Select.Trigger class="w-full">
						{schemaTriggerContent}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each schemaOptions as option (option.value)}
								<Select.Item value={option.value} label={option.label}>
									{option.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Basic Search Fields -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<div>
					<Input
						type="text"
						bind:value={searchParamsObj.name}
						name="name"
						placeholder="Search by name"
					/>
				</div>
				<div>
					<Input
						type="text"
						bind:value={searchParamsObj.tags}
						name="tags"
						placeholder="Search by tags"
					/>
				</div>
				<div>
					<Input
						type="text"
						bind:value={searchParamsObj.primary_url}
						name="primary_url"
						placeholder="Search by primary URL"
					/>
				</div>
			</div>

			<!-- Date and Location Fields -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div>
					<Input
						type="datetime-local"
						name="last_updated"
						bind:value={searchParamsObj.last_updated}
						placeholder="Last updated"
					/>
				</div>
				<div>
					<Input type="text" bind:value={searchParamsObj.lat} name="lat" placeholder="Latitude" />
				</div>
				<div>
					<Input type="text" bind:value={searchParamsObj.lon} name="lon" placeholder="Longitude" />
				</div>
				<div>
					<Input type="text" bind:value={searchParamsObj.range} name="range" placeholder="Range" />
				</div>
			</div>

			<!-- Location Fields -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<Input
						type="text"
						bind:value={searchParamsObj.locality}
						name="locality"
						placeholder="Locality"
					/>
				</div>
				<div>
					<Input
						type="text"
						bind:value={searchParamsObj.region}
						name="region"
						placeholder="Region"
					/>
				</div>
				<div>
					<Select.Root type="single" name="country" bind:value={searchParamsObj.country}>
						<Select.Trigger class="w-full">
							{countryTriggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each countryOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Status and Page Size -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<Select.Root type="single" name="status" bind:value={searchParamsObj.status}>
						<Select.Trigger class="w-full">
							{statusTriggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each statusOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
				<div>
					<Select.Root type="single" name="page_size" bind:value={searchParamsObj.page_size}>
						<Select.Trigger class="w-full">
							{pageSizeTriggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each pageSizeOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<!-- Tag Options -->
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						bind:checked={tagsFilterChecked}
						name="tags_filter"
						class="rounded"
						onchange={(event) => {
							const target = event.target as HTMLInputElement;
							if (!target) return;
							tagsFilterChecked = target.checked;
							searchParamsObj.tags_filter = tagsFilterChecked ? 'and' : 'or';
						}}
					/>
					<label class="text-sm font-medium" for="tags_filter">All tags</label>
				</div>
				<div class="flex items-center space-x-2">
					<input
						type="checkbox"
						bind:checked={tagsExactChecked}
						name="tags_exact"
						class="rounded"
						onchange={(event) => {
							const target = event.target as HTMLInputElement;
							if (!target) return;
							tagsExactChecked = target.checked;
							searchParamsObj.tags_exact = tagsExactChecked ? 'true' : 'false';
						}}
					/>
					<label class="text-sm font-medium" for="tags_exact">Exact matches only</label>
				</div>
			</div>

			<!-- Search Button -->
			<div class="flex justify-center">
				<Button
					type="submit"
					disabled={isLoading}
					class="w-full sm:w-auto px-8"
					onclick={() => {
						window.goatcounter.count({
							path: (p) => p + '?search',
							title: 'IE search',
							event: true
						});
					}}
				>
					{#if isLoading}
						Searching...
					{:else}
						Search
					{/if}
				</Button>
			</div>
		</form>
	</div>

	<div class="sm:flex sm:items-center">
		<div class="text-gray-900 sm:flex-auto dark:text-gray-50">
			<p class="text-sm">
				When searching for tags, select <em>all tags</em> so only nodes with all of the tags entered
				are shown. Select&nbsp;
				<em>exact matches only</em> so that spelling variations are not shown.
			</p>
		</div>
	</div>

	<div class="mt-2 flex flex-col md:mt-4">
		{#if meta?.number_of_results && !isLoading}
			<div class="mb-2 flex-auto">
				Result Count: {page > 1 ? (page - 1) * pageSize + 1 : 1}-
				{page * pageSize > meta.number_of_results ? meta.number_of_results : page * pageSize} / {meta.number_of_results}
			</div>
		{/if}
		<div class="mx-4 my-2 overflow-x-auto text-center sm:-mx-6 lg:-mx-8">
			{#if isLoading}
				<div class="loading-indicator">Loading...</div>
			{:else if sortedNodes.length === 0}
				<div class="text-center">Result not found, try to search again!</div>
			{:else}
				<div>
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<SortableColumn
										prop="primary_url"
										currentSortProp={sortProp}
										currentSortOrder={sortOrder}
										onSort={handleSort}
									>
										Primary URL
									</SortableColumn>
									<SortableColumn
										prop="name"
										currentSortProp={sortProp}
										currentSortOrder={sortOrder}
										onSort={handleSort}
									>
										Name
									</SortableColumn>
									<SortableColumn
										prop="profile_url"
										currentSortProp={sortProp}
										currentSortOrder={sortOrder}
										onSort={handleSort}
									>
										Profile URL
									</SortableColumn>
									<SortableColumn
										prop="last_updated"
										currentSortProp={sortProp}
										currentSortOrder={sortOrder}
										onSort={handleSort}
									>
										Last Updated
									</SortableColumn>
									<Table.Head>Tags</Table.Head>
									{#if searchParamsObj?.locality}
										<SortableColumn
											prop="locality"
											currentSortProp={sortProp}
											currentSortOrder={sortOrder}
											onSort={handleSort}
										>
											Locality
										</SortableColumn>
									{/if}
									{#if searchParamsObj?.region}
										<SortableColumn
											prop="region"
											currentSortProp={sortProp}
											currentSortOrder={sortOrder}
											onSort={handleSort}
										>
											Region
										</SortableColumn>
									{/if}
									{#if searchParamsObj?.country}
										<SortableColumn
											prop="country"
											currentSortProp={sortProp}
											currentSortOrder={sortOrder}
											onSort={handleSort}
										>
											Country
										</SortableColumn>
									{/if}
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each sortedNodes as node (node)}
									<Table.Row class="hover:opacity-80">
										<Table.Cell class="whitespace-normal p-1 text-sm md:p-2">
											<a
												href={`https://${node.primary_url || ''}`}
												target="_blank"
												rel="noreferrer"
												class="font-bold text-primary-500"
											>
												{node.primary_url && node.primary_url.length > 30
													? `${node.primary_url.substring(0, 30)}...`
													: node.primary_url || 'N/A'}
											</a>
										</Table.Cell>
										<Table.Cell class="whitespace-normal p-1 text-sm md:p-2">
											{node.name || 'N/A'}
										</Table.Cell>
										<Table.Cell class="whitespace-normal p-1 text-sm md:p-2">
											<a
												href={`${node.profile_url || ''}`}
												target="_blank"
												rel="noreferrer"
												class="font-bold text-primary-500"
											>
												{node.profile_url && node.profile_url.length > 65
													? `${node.profile_url.substring(0, 65)}...`
													: node.profile_url || 'N/A'}
											</a>
										</Table.Cell>
										<Table.Cell
											class="whitespace-normal p-1 text-sm text-gray-900 md:p-2 dark:text-gray-50"
										>
											{node.last_updated ? formatDate(node.last_updated) : 'N/A'}
										</Table.Cell>
										<Table.Cell class="p-1 text-sm md:p-2">
											<div class="flex flex-wrap gap-1">
												{#if node?.tags?.length}
													{#each node.tags as tag (tag)}
														<Badge variant="secondary" class="text-xs">
															{tag}
														</Badge>
													{/each}
												{:else}
													<span class="text-gray-500">No Tags</span>
												{/if}
											</div>
										</Table.Cell>
										{#if searchParamsObj?.locality}
											<Table.Cell
												class="whitespace-normal p-1 text-sm text-gray-900 md:p-2 dark:text-gray-50"
											>
												{node.locality || 'N/A'}
											</Table.Cell>
										{/if}
										{#if searchParamsObj?.region}
											<Table.Cell
												class="whitespace-normal p-1 text-sm text-gray-900 md:p-2 dark:text-gray-50"
											>
												{node.region || 'N/A'}
											</Table.Cell>
										{/if}
										{#if searchParamsObj?.country}
											<Table.Cell
												class="whitespace-normal p-1 text-sm text-gray-900 md:p-2 dark:text-gray-50"
											>
												{node.country || 'N/A'}
											</Table.Cell>
										{/if}
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
					<div class="my-4 text-center">
						{#if meta && meta.total_pages > 1 && searchParams.has('schema')}
							<Pagination.Root
								count={meta.number_of_results}
								{page}
								perPage={pageSize}
								{siblingCount}
							>
								{#snippet children({ pages, currentPage })}
									<Pagination.Content>
										<Pagination.Item>
											<Pagination.PrevButton
												disabled={page <= 1}
												onclick={() => handlePageChange(page - 1)}
											>
												<ChevronLeftIcon class="size-4" />
												<span class="hidden sm:block">Previous</span>
											</Pagination.PrevButton>
										</Pagination.Item>
										{#each pages as pageItem (pageItem.key)}
											{#if pageItem.type === 'ellipsis'}
												<Pagination.Item>
													<Pagination.Ellipsis />
												</Pagination.Item>
											{:else}
												<Pagination.Item>
													<Pagination.Link
														page={pageItem}
														isActive={currentPage === pageItem.value}
														onclick={() => handlePageChange(pageItem.value)}
													>
														{pageItem.value}
													</Pagination.Link>
												</Pagination.Item>
											{/if}
										{/each}
										<Pagination.Item>
											<Pagination.NextButton
												disabled={page >= meta.total_pages}
												onclick={() => handlePageChange(page + 1)}
											>
												<span class="hidden sm:block">Next</span>
												<ChevronRightIcon class="size-4" />
											</Pagination.NextButton>
										</Pagination.Item>
									</Pagination.Content>
								{/snippet}
							</Pagination.Root>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
