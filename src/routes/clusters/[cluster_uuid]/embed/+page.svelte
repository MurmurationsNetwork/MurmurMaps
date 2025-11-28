<script lang="ts">
	import { goto } from '$app/navigation';
	import { getPublishedMapNodes } from '$lib/api/nodes';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Map, MarkerCluster, TileLayer } from '$lib/svelte-leaflet';
	import type { DropdownField } from '$lib/types/enum-dropdown';
	import type { MapNode } from '$lib/types/node';
	import { CircleAlert, Search, Tag } from '@lucide/svelte';
	import L, { MarkerClusterGroup } from 'leaflet';

	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let cluster = $state(data.cluster);
	let nodes: MapNode[] = $state(data.nodes ?? []);
	let enumsDropdown: DropdownField[] = $state(data.enumsDropdown ?? []);
	let nameSearch: string = $state(data.nameSearch ?? '');
	let tagSearch: string = $state(data.tagSearch ?? '');
	let enumFilters: Record<string, string> = $state(data.enumFilters ?? {});
	let clusterInstance: MarkerClusterGroup | undefined = $state();
	let showSearch = $state(data.showSearch ?? true);

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

	function clearFilters() {
		nameSearch = '';
		tagSearch = '';
		enumFilters = {};
		reloadData();
	}

	function hasActiveFilters() {
		return nameSearch.trim() || tagSearch.trim() || Object.values(enumFilters).some((v) => v);
	}

	$effect(() => {
		untrack(() => {
			reloadData();
		});
	});

	async function reloadData() {
		const query = new SvelteURLSearchParams();
		query.set('showSearch', showSearch.toString());
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
</script>

<div class="w-full h-screen relative">
	<Map
		options={{
			center: [cluster?.centerLat ?? 46.603354, cluster?.centerLon ?? 1.888334],
			zoom: cluster?.scale ?? 6
		}}
	>
		<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
		<MarkerCluster bind:instance={clusterInstance} />
	</Map>

	{#if showSearch}
		<div class="absolute top-2 left-2 right-2 z-2000">
			<Card class="shadow-lg">
				<CardContent class="p-2">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							reloadData();
						}}
					>
						<div class="flex flex-wrap items-center gap-2">
							<div class="relative flex-1 min-w-[120px]">
								<Search
									class="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="nameSearch"
									placeholder="Search by name..."
									class="pl-7 h-8 text-sm w-full"
									bind:value={nameSearch}
								/>
							</div>
							<div class="relative flex-1 min-w-[140px]">
								<Tag
									class="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="tagSearch"
									placeholder="Search by tags..."
									class="pl-7 h-8 text-sm w-full"
									bind:value={tagSearch}
								/>
							</div>

							{#if enumsDropdown && enumsDropdown.length > 0}
								{#each enumsDropdown as dropdown (dropdown.field_name)}
									<div class="flex-1 min-w-[100px]">
										<Select.Root type="single" bind:value={enumFilters[dropdown.field_name]}>
											<Select.Trigger class="h-8 text-sm w-full">
												<span class="truncate">
													{getDropdownTriggerContent(dropdown, dropdown.field_name)}
												</span>
											</Select.Trigger>
											<Select.Content class="z-3000">
												<Select.Item value="">All {dropdown.title}</Select.Item>
												{#each dropdown.options as opt (opt.value)}
													<Select.Item value={opt.value}>{opt.label}</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								{/each}
							{/if}

							<Button type="submit" size="sm" class="h-8 px-3 shrink-0">
								<Search class="h-3 w-3 mr-1" /> Search
							</Button>
							{#if hasActiveFilters()}
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="h-8 px-3 shrink-0"
									onclick={clearFilters}
								>
									Clear Filters
								</Button>
							{/if}
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	{/if}

	{#if !nodes?.length}
		<div class="absolute inset-0 flex items-center justify-center z-999 pointer-events-none">
			<Card class="shadow-lg">
				<CardContent class="p-6">
					<div class="text-center space-y-2">
						<CircleAlert class="h-6 w-6 text-muted-foreground mx-auto" />
						<p class="text-sm text-muted-foreground">
							{nameSearch.trim() || tagSearch.trim() || hasActiveFilters()
								? 'No results found.'
								: 'No map data available.'}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
