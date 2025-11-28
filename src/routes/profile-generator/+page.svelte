<script lang="ts">
	import { getProfile, getProfiles } from '$lib/api/profiles';
	import { getSchemas } from '$lib/api/schemas';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { dbStatus } from '$lib/stores/db-status';
	import { sourceIndexStore } from '$lib/stores/source-index';
	import type { Profile, ProfileCardType, ProfileObject } from '$lib/types/profile';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';
	import ProfileCard from './ProfileCard.svelte';
	import ProfileEditor from './ProfileEditor.svelte';
	import SchemaSelector from './SchemaSelector.svelte';

	let { data }: { data: PageData } = $props();

	const queryClient = new QueryClient();

	// Set selected schema in the parent component
	let schemasSelected: string[] = $state([]);
	let profileCards: ProfileCardType[] = $state([]);
	let currentProfile: ProfileObject = $state({});
	let currentTitle: string = $state('');
	let currentCuid: string = $state('');
	let isDbOnline: boolean = $state(true);
	let schemasList: { value: string; label: string }[] = $state([]);
	let sourceIndexUrl: string = $state('');
	let sourceLibraryUrl: string = $state('');
	let sourceIndexId: number | null = $state(null);

	const user = data?.user ?? null;

	// Subscribe to dbStatus changes
	dbStatus.subscribe((value) => (isDbOnline = value));

	onMount(async () => {
		if ($sourceIndexStore) {
			await loadInitialData();
		} else {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		if (user) {
			await fetchProfiles();
		}
	});

	async function loadInitialData() {
		sourceIndexId = $sourceIndexStore;

		if (!sourceIndexId) {
			toast.error('Please select a Source Index in the top right first.');
			return;
		}

		const src = data.sourceIndexes.find((s) => s.id === sourceIndexId);

		if (!src) {
			toast.error('Invalid Source Index.');
			return;
		}

		sourceLibraryUrl = src.libraryUrl;
		sourceIndexUrl = src.url;

		try {
			const { data: schemas } = await getSchemas(`${sourceLibraryUrl}/v2/schemas`);
			schemasList = schemas
				.filter(({ name }) => !name.startsWith('default-v'))
				.filter(({ name }) => !name.startsWith('test_schema-v'))
				.map(({ name }) => ({
					value: name,
					label: name
				}))
				.sort((a, b) => a.label.localeCompare(b.label));
		} catch (err) {
			console.error(err);
			toast.error('Failed to load schemas from the selected Source Index.');
		}
	}

	// When the source index changes, load the initial data
	$effect(() => {
		const id = $sourceIndexStore;
		if (!id) return;

		queueMicrotask(async () => {
			await loadInitialData();

			schemasSelected = [];
			currentProfile = {};
			currentTitle = '';
			currentCuid = '';
		});
	});

	// Fetch profiles when dbStatus is online and user is logged in
	$effect(() => {
		if (isDbOnline && user && sourceIndexUrl) {
			fetchProfiles();
		}
	});

	function handleSchemasSelected(schemas: string[]): void {
		schemasSelected = schemas;
	}

	function handleSchemasReset(): void {
		schemasSelected = [];
		currentProfile = {};
		currentTitle = '';
		currentCuid = '';
	}

	function handleProfileUpdated(): void {
		fetchProfiles();
	}

	async function fetchProfiles(): Promise<void> {
		if (!sourceIndexId) {
			toast.error('Please select a Source Index first.');
			return;
		}

		try {
			const { data: profiles, success } = await getProfiles(sourceIndexId);
			if (success) {
				profileCards = profiles.map((profile: Profile) => ({
					cuid: profile.cuid,
					title: profile.title ?? '',
					node_id: profile.nodeId ?? '',
					status: 'received',
					last_updated: new Date(profile.lastUpdated * 1000).toLocaleString(),
					schemas: profile.linkedSchemas ? JSON.parse(profile.linkedSchemas) : []
				}));
			} else {
				toast.error('Failed to fetch profiles, please try again later');
			}
		} catch (err) {
			console.error('Error fetching profiles:', err);
		}
	}

	async function handleProfileModify(cuid: string): Promise<void> {
		handleSchemasReset();
		try {
			const { data: profile, success } = await getProfile(cuid);
			if (!success) {
				throw new Error(`Failed to fetch profile details: ${profile}`);
			}

			currentProfile = profile.profile ? JSON.parse(profile.profile) : {};
			schemasSelected = profile.linkedSchemas ? JSON.parse(profile.linkedSchemas) : [];
			currentTitle = profile.title ?? '';
			currentCuid = cuid;
		} catch (err) {
			console.error('Error fetching profile details:', err);
		}
	}
</script>

<QueryClientProvider client={queryClient}>
	<div class="container mx-auto p-4">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- BEGIN: List of user-generated profiles -->
			<div class="md:col-span-1 space-y-4 overflow-auto">
				{#if profileCards.length === 0}
					<Card>
						<CardContent class="p-6">
							<div class="space-y-4">
								{#if !$dbStatus}
									<p class="font-medium text-foreground">
										Unable to connect to the database, Unable to load profiles
									</p>
								{:else if !user}
									<p class="font-medium text-foreground">
										Login first if you want to save your profile here, or just create a profile by
										selecting a schema from the list.
									</p>
									<p class="font-medium text-foreground pt-4">
										<a
											href="https://docs.murmurations.network/guides/create-a-profile.html#_2-hosted-by-our-profile-generator"
											target="_blank"
											class="text-primary hover:text-primary/80 underline"
											>See our documentation for details</a
										>
									</p>
								{:else}
									<p class="font-medium text-foreground">No saved profiles found</p>
								{/if}
							</div>
						</CardContent>
					</Card>
				{/if}
				{#each profileCards as profileCard (profileCard.cuid)}
					<ProfileCard
						{...profileCard}
						{sourceIndexUrl}
						profileUpdated={handleProfileUpdated}
						profileModify={handleProfileModify}
					/>
				{/each}
			</div>
			<!-- END: List of user-generated profiles -->
			<!-- BEGIN: Schema selection box / Create/modify profile input / Profile preview -->
			<div class="md:col-span-2 space-y-4">
				{#if schemasSelected.length === 0}
					<SchemaSelector
						schemasList={schemasList.map(({ value }) => value)}
						schemaSelected={handleSchemasSelected}
					/>
				{:else}
					<ProfileEditor
						{schemasSelected}
						{currentProfile}
						{currentTitle}
						{currentCuid}
						schemasReset={handleSchemasReset}
						profileUpdated={handleProfileUpdated}
						{user}
						{sourceIndexUrl}
						{sourceLibraryUrl}
						{sourceIndexId}
					/>
				{/if}
			</div>
			<!-- END: Schema selection box / Create/modify profile input / Profile preview -->
		</div>
	</div>
</QueryClientProvider>
