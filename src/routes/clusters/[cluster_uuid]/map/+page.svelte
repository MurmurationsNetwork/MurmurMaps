<script lang="ts">
	import { goto } from '$app/navigation';
	import { getPublishedMapNodes } from '$lib/api/nodes';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Map, MarkerCluster, TileLayer } from '$lib/svelte-leaflet';
	import type { ClusterPublic } from '$lib/types/cluster';
	import type { DropdownField } from '$lib/types/enum-dropdown';
	import type { MapNode } from '$lib/types/node';
	import { ArrowLeft, Check, CircleAlert, Code, Copy, Search, Tag } from '@lucide/svelte';
	import L, { MarkerClusterGroup } from 'leaflet';

	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let nodes: MapNode[] = $state(data?.nodes ?? []);
	let cluster: ClusterPublic = $state(data?.cluster);
	let nameSearch: string = $state(data?.nameSearch ?? '');
	let tagSearch: string = $state(data?.tagSearch ?? '');
	let enumsDropdown: DropdownField[] = $state(data?.enumsDropdown ?? []);
	let enumFilters: Record<string, string> = $state(data?.enumFilters ?? {});
	let clusterInstance: MarkerClusterGroup | undefined = $state();

	// Iframe configuration
	let iframeCopied: boolean = $state(false);
	let iframeWidth: string = $state('100%');
	let iframeHeight: string = $state('600');
	let iframeBorder: string = $state('0');
	let showSearchBar: boolean = $state(true);

	function getDropdownTriggerContent(dropdown: DropdownField, fieldName: string) {
		const selectedValue = enumFilters[fieldName];
		if (!selectedValue) {
			return `All ${dropdown.title}`;
		}
		const selectedOption = dropdown.options.find((opt) => opt.value === selectedValue);
		return selectedOption?.label ?? `All ${dropdown.title}`;
	}

	function createPopupContent(node: MapNode): string {
		let content = `<div class="min-w-[200px] font-sans break-words">`;

		if (node.primaryUrl && node.primaryUrl.trim()) {
			content += `<div class="mb-2">
			<strong>URL:</strong>
			<a href="${node.primaryUrl}" target="_blank" rel="noopener noreferrer" 
			   class="text-blue-700 underline break-words">
				${node.primaryUrl}
			</a>
		</div>`;
		}

		if (node.id) {
			content += `<div class="mb-2">
			<strong>Source:</strong>
			<a href="/clusters/${cluster.clusterUuid}/nodes/${node.id}" target="_blank" rel="noopener noreferrer" 
			   class="text-blue-700 underline break-words">
				Click to view node details
			</a>
		</div>`;
		}

		content += `</div>`;
		return content;
	}

	$effect(() => {
		untrack(() => {
			reloadData();
		});
	});

	async function reloadData() {
		const query = new SvelteURLSearchParams();
		if (nameSearch) query.set('name', nameSearch);
		if (tagSearch) query.set('tags', tagSearch);

		// Add enumFilters to query parameters if not empty
		for (const [key, value] of Object.entries(enumFilters)) {
			if (value) {
				query.set(key, value);
			}
		}

		goto(`?${query.toString()}`, { replaceState: true, noScroll: true });

		if (cluster?.clusterUuid) {
			const { data: mapNodes } = await getPublishedMapNodes(
				cluster.clusterUuid,
				nameSearch,
				tagSearch,
				enumFilters,
				fetch
			);
			nodes = mapNodes;

			// Clear + Add markers manually
			if (clusterInstance) {
				clusterInstance.clearLayers();

				mapNodes?.forEach((node) => {
					const marker = L.marker([node.lat, node.lon], {
						title: String(node.id)
					}).bindPopup(createPopupContent(node));
					clusterInstance?.addLayer(marker);
				});
			}
		}
	}

	function clearFilters() {
		nameSearch = '';
		tagSearch = '';
		enumFilters = {};
		reloadData();
	}

	function hasActiveFilters() {
		return nameSearch.trim() || tagSearch.trim() || Object.values(enumFilters).some((v) => v);
	}

	function getIframeCode() {
		const embedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/clusters/${cluster.clusterUuid}/embed`;
		const urlParams = new SvelteURLSearchParams();
		urlParams.set('showSearch', showSearchBar.toString());

		const fullUrl = `${embedUrl}?${urlParams.toString()}`;
		return `<iframe src="${fullUrl}" width="${iframeWidth}" height="${iframeHeight}" frameborder="${iframeBorder}" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`;
	}

	async function copyIframeCode() {
		const iframeCode = getIframeCode();

		try {
			await navigator.clipboard.writeText(iframeCode);
			iframeCopied = true;
			setTimeout(() => {
				iframeCopied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy iframe code:', err);
		}
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
			<div class="flex items-center justify-between">
				<Button variant="outline" size="sm" href="/">
					<ArrowLeft class="h-4 w-4" />
					Back to Home
				</Button>
				<Popover.Root>
					<Popover.Trigger class={buttonVariants({ variant: 'default', size: 'sm' })}>
						<Code class="h-4 w-4 mr-2" />
						Embed Map
					</Popover.Trigger>
					<Popover.Content class="w-96">
						<div class="grid gap-4">
							<div class="space-y-2">
								<h4 class="font-medium leading-none">Embed Configuration</h4>
								<p class="text-muted-foreground text-sm">
									Customize the iframe settings for embedding this map.
								</p>
							</div>
							<div class="grid gap-3">
								<div class="grid grid-cols-3 items-center gap-4">
									<Label for="width">Width</Label>
									<Input id="width" bind:value={iframeWidth} class="col-span-2 h-8" />
								</div>
								<div class="grid grid-cols-3 items-center gap-4">
									<Label for="height">Height</Label>
									<Input id="height" bind:value={iframeHeight} class="col-span-2 h-8" />
								</div>
								<div class="grid grid-cols-3 items-center gap-4">
									<Label for="border">Border</Label>
									<Input id="border" bind:value={iframeBorder} class="col-span-2 h-8" />
								</div>
								<div class="flex items-center justify-between">
									<Label for="show-search">Show Search Bar</Label>
									<Switch id="show-search" bind:checked={showSearchBar} />
								</div>
							</div>
							<div class="space-y-2">
								<Label for="iframe-code">Iframe Code</Label>
								<textarea
									id="iframe-code"
									readonly
									class="w-full h-20 p-2 text-xs border rounded resize-none bg-muted"
									value={getIframeCode()}
								></textarea>
							</div>
							<Button onclick={copyIframeCode} class="w-full">
								{#if iframeCopied}
									<Check class="h-4 w-4 mr-2" />
									Copied!
								{:else}
									<Copy class="h-4 w-4 mr-2" />
									Copy Iframe Code
								{/if}
							</Button>
						</div>
					</Popover.Content>
				</Popover.Root>
			</div>

			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<h1 class="text-3xl font-bold tracking-tight">{cluster.name} - Map View</h1>
				</div>
			</div>

			<Card>
				<CardContent class="p-6">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							reloadData();
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

						<div class="flex gap-2">
							<Button type="submit" class="shrink-0">
								<Search class="h-4 w-4 mr-2" />
								Search
							</Button>
							{#if hasActiveFilters()}
								<Button type="button" variant="outline" onclick={clearFilters}>Clear Filters</Button
								>
							{/if}
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				{#if nodes?.length && nodes.length > 0}
					<CardContent class="p-0">
						<div class="relative z-0 w-full h-[700px]">
							<Map
								options={{
									center: [cluster?.centerLat ?? 46.603354, cluster?.centerLon ?? 1.888334],
									zoom: cluster?.scale ?? 6
								}}
							>
								<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
								<MarkerCluster bind:instance={clusterInstance} />
							</Map>
						</div>
					</CardContent>
				{/if}
			</Card>

			{#if !nodes?.length || nodes.length === 0}
				<Card>
					<CardContent class="flex h-32 items-center justify-center">
						<div class="text-center space-y-2">
							<CircleAlert class="h-8 w-8 text-muted-foreground mx-auto" />
							<h3 class="text-lg font-semibold">
								{nameSearch.trim() || tagSearch.trim()
									? 'No Results Found'
									: 'No Map Data Available'}
							</h3>
							<p class="text-sm text-muted-foreground">
								{nameSearch.trim() || tagSearch.trim()
									? 'Try adjusting your search terms.'
									: "This cluster doesn't contain any nodes with location data yet."}
							</p>
						</div>
					</CardContent>
				</Card>
			{:else}
				<Card>
					<CardContent class="p-6">
						<p class="text-sm text-muted-foreground">
							Showing {nodes.length} node{nodes.length === 1 ? '' : 's'} with location data
						</p>
					</CardContent>
				</Card>
			{/if}
		</div>
	{/if}
</div>
