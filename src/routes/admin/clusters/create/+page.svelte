<script lang="ts">
	import { goto } from '$app/navigation';
	import { createCluster } from '$lib/api/clusters';
	import { getCountries } from '$lib/api/countries';
	import { getSchemas } from '$lib/api/schemas';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Command from '$lib/components/ui/command';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import type { ClusterCreateInput } from '$lib/types/cluster';
	import { cn } from '$lib/utils';
	import { fetchProfiles } from '$lib/utils/profile';
	import { Check, ChevronsUpDown } from '@lucide/svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sourceIndexOptions = data?.sourceIndexes ?? [];

	const schemaOptions = $state(data?.schemas ?? []);

	const countryOptions = $state(data?.countries ?? []);

	let clusterName = $state('');
	let clusterDescription = $state('');
	let clusterCenterLatitude = $state(0);
	let clusterCenterLongitude = $state(0);
	let clusterScale = $state(5);
	let sourceIndex = $state(sourceIndexOptions[0]?.url ?? '');
	let sourceIndexId = $state(sourceIndexOptions[0]?.id ?? 0);
	let schema = $state(schemaOptions[0]?.value ?? '');
	let name = $state('');
	let lat = $state<number | null>(null);
	let lon = $state<number | null>(null);
	let range = $state('');
	let locality = $state('');
	let region = $state('');
	let country = $state('');
	let tags = $state('');
	let allTags = $state(false);
	let tagsExact = $state(false);
	let primaryUrl = $state('');

	let countrySearchOpen = $state(false);
	let countrySearchResults = $state<{ label: string; value: string }[]>(data?.countries);
	let triggerRef = $state<HTMLButtonElement>(null!);

	let isCreatingCluster = $state(false);
	let loadingSchemas = $state(false);
	let loadingCountries = $state(false);

	const sourceIndexTriggerContent = $derived(
		sourceIndexOptions.find((option) => option.url === sourceIndex)?.label ??
			'Select a source index'
	);

	const schemaTriggerContent = $derived(
		schemaOptions.find((option) => option.value === schema)?.label ?? 'Select a schema'
	);

	async function handleSourceIndexChange(newSourceIndex: string) {
		sourceIndex = newSourceIndex;
		sourceIndexId = sourceIndexOptions.find((option) => option.url === newSourceIndex)?.id ?? 0;

		const selectedOption = sourceIndexOptions.find((option) => option.url === newSourceIndex);
		const libraryURL = selectedOption?.libraryUrl ?? '';

		schema = '';
		country = '';

		await Promise.all([loadSchemasForIndex(libraryURL), loadCountriesForIndex(libraryURL)]);
	}

	async function loadSchemasForIndex(libraryURL: string) {
		loadingSchemas = true;
		try {
			const { data: schemas } = await getSchemas(`${libraryURL}/v2/schemas`);
			schemaOptions.length = 0;
			schemaOptions.push(
				...schemas
					.filter(({ name }) => !name.startsWith('default-v'))
					.filter(({ name }) => !name.startsWith('test_schema-v'))
					.map(({ name }) => ({
						value: name,
						label: name
					}))
					.sort((a, b) => a.label.localeCompare(b.label))
			);
			schema = schemaOptions[0]?.value ?? '';
		} catch (error) {
			console.error('Error loading schemas:', error);
			toast.error('Failed to load schemas for the selected index');
		} finally {
			loadingSchemas = false;
		}
	}

	async function loadCountriesForIndex(libraryURL: string) {
		loadingCountries = true;
		try {
			const { data: rawCountries } = await getCountries(`${libraryURL}/v2/countries`);
			countryOptions.length = 0;
			countryOptions.push(
				...Object.entries(rawCountries).map(([key, names]) => ({
					value: key,
					label: Array.isArray(names)
						? (names[1] || names[0])
								.split(' ')
								.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' ')
						: ''
				}))
			);
			countrySearchResults = [...countryOptions];
		} catch (error) {
			console.error('Error loading countries:', error);
			toast.error('Failed to load countries for the selected index');
		} finally {
			loadingCountries = false;
		}
	}

	function searchCountries(query: string) {
		countrySearchResults = countryOptions.filter((option) =>
			option.label.toLowerCase().includes(query.toLowerCase())
		);
	}

	function closeAndFocusCountryTrigger() {
		countrySearchOpen = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}

	async function submitCluster(event: Event) {
		event.preventDefault();

		// Scroll to the top of the page
		window.scrollTo({ top: 0, behavior: 'smooth' });

		isCreatingCluster = true;

		try {
			const queryParams = buildQueryParams();
			const pageQueries = 'page=1&page_size=500&status=posted';
			const queryString = [...queryParams, pageQueries].join('&');

			const clusterData: ClusterCreateInput = {
				name: clusterName,
				description: clusterDescription,
				indexUrl: sourceIndex + '/v2/nodes',
				queryUrl: `?${queryString}`,
				centerLat: clusterCenterLatitude,
				centerLon: clusterCenterLongitude,
				scale: clusterScale,
				sourceIndexId
			};

			const { rawNodes, meta } = await fetchProfiles(clusterData.indexUrl, clusterData.queryUrl);
			if (rawNodes.length === 0) {
				toast.error('No nodes found. Please update your cluster settings.');
				return;
			}

			if (meta?.total_pages > 1) {
				toast.error('Too many nodes. Please narrow your search.');
				return;
			}

			const response = await createCluster(clusterData);

			if (!response?.success) throw new Error('Create cluster failed');
			const clusterUuid = response?.data?.clusterUuid;
			const jobUuid = response?.data?.jobUuid;
			toast.success('Cluster created successfully');
			await goto(`/admin/clusters/${clusterUuid}/select?jobUuid=${jobUuid}`);
		} catch (error) {
			console.error('Error creating cluster:', error);
			toast.error('An error occurred while creating the cluster. Please try again.');
		} finally {
			isCreatingCluster = false;
		}
	}

	function buildQueryParams() {
		const queryParams: string[] = [];

		if (schema) queryParams.push(`schema=${encodeURIComponent(schema)}`);
		if (name) queryParams.push(`name=${encodeURIComponent(name)}`);
		if (lat !== null) queryParams.push(`lat=${encodeURIComponent(lat)}`);
		if (lon !== null) queryParams.push(`lon=${encodeURIComponent(lon)}`);
		if (range) queryParams.push(`range=${encodeURIComponent(range)}`);
		if (locality) queryParams.push(`locality=${encodeURIComponent(locality)}`);
		if (region) queryParams.push(`region=${encodeURIComponent(region)}`);
		if (country) queryParams.push(`country=${encodeURIComponent(country)}`);
		if (primaryUrl) queryParams.push(`primary_url=${encodeURIComponent(primaryUrl)}`);

		// Tags handling
		if (tags) {
			queryParams.push(`tags=${encodeURIComponent(tags)}`);
			queryParams.push(`tags_filter=${allTags ? 'and' : 'or'}`);
		}

		// Tags exact matching
		if (tagsExact) {
			queryParams.push('tags_exact=true');
		}

		return queryParams;
	}
</script>

<div class="container mx-auto p-4">
	<h2 class="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-50">
		Create a Cluster or Directory
	</h2>
	<p class="mb-8 text-slate-700 dark:text-slate-300">
		Import nodes from the distributed Murmurations network to create your own custom clusters and
		directories.
	</p>

	<form class="space-y-8" onsubmit={submitCluster}>
		<!-- Cluster Settings -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-xs">
			<div class="flex flex-col space-y-1.5 p-0">
				<h3 class="text-2xl font-semibold leading-none tracking-tight">Cluster Settings</h3>
			</div>
			<div class="p-0 pt-4">
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="cluster-name">Cluster Name</Label>
						<Input
							type="text"
							id="cluster-name"
							bind:value={clusterName}
							class="w-full"
							placeholder="Enter cluster name"
						/>
						<p class="text-sm text-muted-foreground">
							A familiar name to make it easy for you to identify
						</p>
					</div>
					<div class="grid gap-2">
						<Label for="cluster-description">Cluster Description</Label>
						<Input
							type="text"
							id="cluster-description"
							bind:value={clusterDescription}
							class="w-full"
							placeholder="Enter cluster name"
						/>
						<p class="text-sm text-muted-foreground">
							A description to help others understand the purpose of the cluster
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Cluster Advanced Settings -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-xs">
			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="cluster-advanced-settings" class="border-none">
					<Accordion.Trigger class="text-left hover:no-underline pb-4">
						<h3 class="text-2xl font-semibold leading-none tracking-tight">
							Cluster Advanced Settings
						</h3>
					</Accordion.Trigger>
					<Accordion.Content class="space-y-4 pt-0">
						<p class="leading-7 text-sm text-muted-foreground">
							Use <a
								href="https://latlong.net"
								target="_blank"
								class="font-medium text-primary underline underline-offset-4">LatLong.net</a
							> to pick a location, enter coordinates with decimals (e.g., 48.86124)
						</p>

						<div class="grid gap-2">
							<Label for="cluster-center-latitude">Cluster Center Latitude</Label>
							<Input
								type="number"
								min="-90"
								max="90"
								step="0.000001"
								id="cluster-center-latitude"
								bind:value={clusterCenterLatitude}
								class="w-full"
								placeholder="Enter latitude"
							/>
						</div>

						<div class="grid gap-2">
							<Label for="cluster-center-longitude">Cluster Center Longitude</Label>
							<Input
								type="number"
								min="-180"
								max="180"
								step="0.000001"
								id="cluster-center-longitude"
								bind:value={clusterCenterLongitude}
								class="w-full"
								placeholder="Enter longitude"
							/>
						</div>

						<div class="grid gap-2">
							<Label for="cluster-scale">Cluster Scale</Label>
							<Input
								type="number"
								min="1"
								max="18"
								step="1"
								id="cluster-scale"
								bind:value={clusterScale}
								class="w-full"
								placeholder="Enter cluster scale"
							/>
							<p class="text-sm text-muted-foreground">
								1 = the entire globe, 18 = maximum zoom in
							</p>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</div>

		<!-- Node Selection -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-xs">
			<div class="flex flex-col space-y-1.5 p-0">
				<h3 class="text-2xl font-semibold leading-none tracking-tight">Node Selection</h3>
			</div>
			<div class="p-0 pt-4">
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="source-index">Source Index</Label>
						<Select.Root
							type="single"
							name="sourceIndex"
							bind:value={sourceIndex}
							onValueChange={handleSourceIndexChange}
						>
							<Select.Trigger class="w-full">
								{sourceIndexTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.GroupHeading>Source Index</Select.GroupHeading>
									{#each sourceIndexOptions as option (option.url)}
										<Select.Item value={option.url} label={option.label}>{option.label}</Select.Item
										>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
						<p class="text-sm text-muted-foreground">
							Select the test or production index to find nodes for your cluster or directory
						</p>
					</div>

					<div class="grid gap-2">
						<Label for="schema">Schema</Label>
						<Select.Root type="single" name="schema" bind:value={schema} disabled={loadingSchemas}>
							<Select.Trigger class="w-full">
								{loadingSchemas ? 'Loading schemas...' : schemaTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.GroupHeading>Schema</Select.GroupHeading>
									{#each schemaOptions as option (option.value)}
										<Select.Item value={option.value} label={option.label}
											>{option.label}</Select.Item
										>
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
						<p class="text-sm text-muted-foreground">
							Select a schema to specify the type of nodes you want to display
						</p>
					</div>

					<div class="pt-2">
						<h4 class="mb-4 text-base font-medium">
							Filter the number of nodes returned from the index using the optional fields below
						</h4>

						<div class="grid gap-4">
							<div class="grid gap-2">
								<Label for="name">Name</Label>
								<Input
									type="text"
									id="name"
									bind:value={name}
									class="w-full"
									placeholder="Enter name"
								/>
								<p class="text-sm text-muted-foreground">Search for nodes with a specific name</p>
							</div>

							<div class="grid gap-2">
								<Label for="lat">Latitude</Label>
								<Input
									type="number"
									min="-90"
									max="90"
									step="0.000001"
									id="lat"
									bind:value={lat}
									class="w-full"
									placeholder="Enter latitude"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes near a specific latitude
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="lon">Longitude</Label>
								<Input
									type="number"
									min="-180"
									max="180"
									step="0.000001"
									id="lon"
									bind:value={lon}
									class="w-full"
									placeholder="Enter longitude"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes near a specific longitude
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="range">Range (i.e. 25km, 15mi)</Label>
								<Input
									type="text"
									id="range"
									bind:value={range}
									class="w-full"
									placeholder="Enter range"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes within a specific distance from the latitude and longitude
									specified above
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="locality">Locality</Label>
								<Input
									type="text"
									id="locality"
									bind:value={locality}
									class="w-full"
									placeholder="Enter locality"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes which list a specific locality (e.g., Paris, London, San
									Francisco, etc.)
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="region">Region</Label>
								<Input
									type="text"
									id="region"
									bind:value={region}
									class="w-full"
									placeholder="Enter region"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes which list a specific region (e.g., Île-de-France, Greater
									London, California, etc.)
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="country" class="block text-sm font-medium">Country</Label>
								<div class="relative">
									<Popover.Root bind:open={countrySearchOpen}>
										<Popover.Trigger bind:ref={triggerRef}>
											{#snippet child({ props })}
												<Button
													variant="outline"
													class="w-full justify-between"
													{...props}
													role="combobox"
													aria-expanded={countrySearchOpen}
													disabled={loadingCountries}
												>
													{loadingCountries
														? 'Loading countries...'
														: country
															? country
															: 'Select a country'}
													<ChevronsUpDown class="opacity-50" />
												</Button>
											{/snippet}
										</Popover.Trigger>
										<Popover.Content class="w-[400px] p-0">
											<Command.Root shouldFilter={false}>
												<Command.Input
													placeholder="Search countries..."
													oninput={(e) => searchCountries(e.currentTarget.value)}
												/>
												<Command.List>
													<Command.Empty>No countries found.</Command.Empty>
													<Command.Group>
														{#each countrySearchResults as result (result.value)}
															<Command.Item
																value={result.value}
																onSelect={() => {
																	country = result.value;
																	closeAndFocusCountryTrigger();
																}}
															>
																<Check class={cn(country !== result.value && 'text-transparent')} />
																<div>
																	<div>{result.label}</div>
																</div>
															</Command.Item>
														{/each}
													</Command.Group>
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
								</div>
								<p class="text-sm text-muted-foreground">
									Search for nodes which list a specific country code
								</p>
							</div>

							<div class="grid gap-2">
								<Label for="tags">Tags</Label>
								<Input
									type="text"
									id="tags"
									bind:value={tags}
									class="w-full"
									placeholder="Enter tags"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes which list specific tags (use commas to search for multiple tags)
								</p>
							</div>

							<div class="flex items-center space-x-2">
								<Checkbox id="all-tags" bind:checked={allTags} class="h-4 w-4" />
								<Label for="all-tags">All Tags</Label>
							</div>
							<p class="-mt-2 text-sm text-muted-foreground">
								Only return nodes with all of the tags specified above
							</p>

							<div class="flex items-center space-x-2">
								<Checkbox id="tags-exact" bind:checked={tagsExact} class="h-4 w-4" />
								<Label for="tags-exact">Tags Exact</Label>
							</div>
							<p class="-mt-2 text-sm text-muted-foreground">
								Only return nodes with exact matches (turns off fuzzy matching)
							</p>

							<div class="grid gap-2">
								<Label for="primary-url">Primary URL</Label>
								<Input
									type="text"
									id="primary-url"
									bind:value={primaryUrl}
									class="w-full"
									placeholder="Enter primary URL"
								/>
								<p class="text-sm text-muted-foreground">
									Search for nodes with a specific primary URL (don't include http or www, e.g., <code
										class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
										>my.org</code
									>
									or
									<code class="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm"
										>some-host.net/my-org</code
									>
									)
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="flex gap-4">
			{#if isCreatingCluster}
				<Button disabled>
					<LoaderCircle class="animate-spin" />
					Please wait
				</Button>
			{:else}
				<Button type="submit">Create</Button>
			{/if}
			<Button variant="secondary" href="/admin">Cancel</Button>
		</div>
	</form>
</div>
