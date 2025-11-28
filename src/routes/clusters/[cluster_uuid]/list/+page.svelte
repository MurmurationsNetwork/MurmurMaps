<script lang="ts">
	import { goto } from '$app/navigation';
	import { getPublishedNodes } from '$lib/api/nodes';
	import NodeDetail from '$lib/components/nodes/NodeDetail.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import * as Select from '$lib/components/ui/select';
	import type { Meta } from '$lib/types/api';
	import type { ClusterPublic } from '$lib/types/cluster';
	import type { DropdownField } from '$lib/types/enum-dropdown';
	import type { Node } from '$lib/types/node';
	import { ArrowLeft, CircleAlert, Database, Search, Tag } from '@lucide/svelte';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { JSONSchema7 } from 'json-schema';

	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { MediaQuery } from 'svelte/reactivity';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let nodes: Node[] = $state(data?.nodes ?? []);
	let cluster: ClusterPublic = $state(data?.cluster);
	let meta: Meta | null = $state((data?.meta as Meta) ?? null);
	let nameSearch: string = $state(data?.nameSearch ?? '');
	let tagSearch: string = $state(data?.tagSearch ?? '');
	let sort: 'name-asc' | 'name-desc' | 'default' = $state(data?.sort ?? 'default');
	let enumsDropdown: DropdownField[] = $state(data?.enumsDropdown ?? []);
	let enumFilters: Record<string, string> = $state(data?.enumFilters ?? {});
	let schema: JSONSchema7 | null = $state(data?.schema ?? null);

	const isDesktop = new MediaQuery('(min-width: 768px)');

	const siblingCount = $derived(isDesktop.current ? 1 : 0);

	let currentPage = $derived(meta?.currentPage ?? 1);

	function getPage() {
		return currentPage;
	}

	async function setPage(newPage: number) {
		await reloadData(newPage);
	}

	const sortOptions = [
		{ value: 'default', label: 'Default' },
		{ value: 'name-asc', label: 'Name (A → Z)' },
		{ value: 'name-desc', label: 'Name (Z → A)' }
	];

	const triggerContent = $derived(
		sortOptions.find((f) => f.value === sort)?.label ?? 'Select a sort option'
	);

	function getDropdownTriggerContent(dropdown: DropdownField, fieldName: string) {
		const selectedValue = enumFilters[fieldName];
		if (!selectedValue) {
			return `All ${dropdown.title}`;
		}
		const selectedOption = dropdown.options.find((opt) => opt.value === selectedValue);
		return selectedOption?.label ?? `All ${dropdown.title}`;
	}

	$effect(() => {
		// Make sure sort can be tracked
		void sort;
		untrack(() => {
			reloadData(1);
		});
	});

	async function reloadData(page = 1) {
		currentPage = page;

		const query = new SvelteURLSearchParams();
		query.set('page', currentPage.toString());
		if (nameSearch) query.set('name', nameSearch);
		if (tagSearch) query.set('tags', tagSearch);
		if (sort) query.set('sort', sort);

		// Add enumFilters to query parameters if not empty
		for (const [key, value] of Object.entries(enumFilters)) {
			if (value) {
				query.set(key, value);
			}
		}

		goto(`?${query.toString()}`, { replaceState: true, noScroll: true });

		if (cluster?.clusterUuid) {
			const res = await getPublishedNodes(
				cluster.clusterUuid,
				currentPage,
				nameSearch,
				tagSearch,
				sort,
				enumFilters,
				fetch
			);
			nodes = res.data;
			meta = res.meta as Meta | null;
		}
	}

	function clearFilters() {
		nameSearch = '';
		tagSearch = '';
		enumFilters = {};
		reloadData(1);
	}

	function hasActiveFilters() {
		return nameSearch.trim() || tagSearch.trim() || Object.values(enumFilters).some((v) => v);
	}
</script>

<div class="container mx-auto p-4">
	{#if !cluster}
		<div class="flex h-32 items-center justify-center">
			<div class="text-center space-y-2">
				<CircleAlert class="h-8 w-8 text-muted-foreground mx-auto" />
				<h3 class="text-lg font-semibold">Cluster Not Found</h3>
				<p class="text-sm text-muted-foreground">The requested cluster could not be loaded.</p>
			</div>
		</div>
	{:else}
		<div class="space-y-6">
			<Button variant="outline" size="sm" href="/">
				<ArrowLeft class="h-4 w-4" />
				Back to Home
			</Button>

			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<h1 class="text-3xl font-bold tracking-tight">{cluster.name}</h1>
				</div>
			</div>

			<Card>
				<CardContent class="p-6">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							reloadData(1);
						}}
						class="space-y-4"
					>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="relative">
								<Search
									class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="nameSearch"
									placeholder="Search by name..."
									class="pl-10"
									bind:value={nameSearch}
								/>
							</div>
							<div class="relative">
								<Tag
									class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="tagSearch"
									placeholder="Search by tags (comma separated)..."
									class="pl-10"
									bind:value={tagSearch}
								/>
							</div>
						</div>

						{#if enumsDropdown && enumsDropdown.length > 0}
							<div class="space-y-3">
								<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each enumsDropdown as dropdown (dropdown.field_name)}
										<Select.Root type="single" bind:value={enumFilters[dropdown.field_name]}>
											<Select.Trigger class="w-full">
												{getDropdownTriggerContent(dropdown, dropdown.field_name)}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="">All {dropdown.title}</Select.Item>
												{#each dropdown.options as opt (opt.value)}
													<Select.Item value={opt.value}>{opt.label}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									{/each}
								</div>
							</div>
						{/if}

						<div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
							<div class="flex gap-2">
								<Button type="submit" class="shrink-0">
									<Search class="h-4 w-4 mr-2" />
									Search
								</Button>
								{#if hasActiveFilters()}
									<Button type="button" variant="outline" onclick={clearFilters}>
										Clear Filters
									</Button>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								<span class="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
								<Select.Root type="single" bind:value={sort}>
									<Select.Trigger class="w-[160px]">
										{triggerContent}
									</Select.Trigger>
									<Select.Content>
										{#each sortOptions as option (option.value)}
											<Select.Item value={option.value}>{option.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>

			{#if !nodes || nodes.length === 0}
				<Card>
					<CardContent class="flex h-32 items-center justify-center">
						<div class="text-center space-y-2">
							<Database class="h-8 w-8 text-muted-foreground mx-auto" />
							<h3 class="text-lg font-semibold">
								{nameSearch.trim() || tagSearch.trim() ? 'No Results Found' : 'No Data Available'}
							</h3>
							<p class="text-sm text-muted-foreground">
								{nameSearch.trim() || tagSearch.trim()
									? 'Try adjusting your search terms.'
									: "This cluster doesn't contain any data yet."}
							</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each nodes as node, index (node.id)}
						{@const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data}
						<Card class="overflow-hidden">
							<CardHeader class="pb-3">
								<CardTitle class="text-lg">
									{nodeData.name || `Item #${index + 1}`}
								</CardTitle>
							</CardHeader>

							{#if nodeData.image}
								<div class="px-6 pb-3">
									<img
										src={nodeData.image}
										alt={nodeData.name || `Item #${index + 1}`}
										class="w-full h-48 object-contain rounded-md border"
									/>
								</div>
							{/if}

							<CardContent class="space-y-3">
								<NodeDetail {nodeData} {schema} />
							</CardContent>
						</Card>
					{/each}
				</div>

				{#if meta && meta.totalPages > 1}
					<div class="flex justify-center mt-8">
						<Pagination.Root
							count={meta.total}
							perPage={meta.perPage}
							{siblingCount}
							bind:page={getPage, setPage}
						>
							{#snippet children({ pages })}
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.PrevButton>
											<ChevronLeftIcon class="size-4" />
											<span class="hidden sm:block">Previous</span>
										</Pagination.PrevButton>
									</Pagination.Item>
									{#each pages as page (page.key)}
										{#if page.type === 'ellipsis'}
											<Pagination.Item>
												<Pagination.Ellipsis />
											</Pagination.Item>
										{:else}
											<Pagination.Item>
												<Pagination.Link
													onclick={() => setPage(page.value)}
													isActive={getPage() === page.value}
													{page}
												>
													{page.value}
												</Pagination.Link>
											</Pagination.Item>
										{/if}
									{/each}
									<Pagination.Item>
										<Pagination.NextButton>
											<span class="hidden sm:block">Next</span>
											<ChevronRightIcon class="size-4" />
										</Pagination.NextButton>
									</Pagination.Item>
								</Pagination.Content>
							{/snippet}
						</Pagination.Root>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
