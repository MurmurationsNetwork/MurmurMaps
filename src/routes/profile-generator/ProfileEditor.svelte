<script lang="ts">
	import {
		createProfile,
		postProfileToIndex,
		updateProfile,
		updateProfileNodeId,
		validateProfile
	} from '$lib/api/profiles';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { dbStatus } from '$lib/stores/db-status';
	import type {
		Profile,
		ProfileCreateInput,
		ProfileObject,
		ProfileUpdateInput,
		ValidationError
	} from '$lib/types/profile';
	import type { Schema } from '$lib/types/schema';
	import { generateSchemaInstance } from '$lib/utils/generator';
	import { parseRef } from '$lib/utils/parser';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteSet } from 'svelte/reactivity';
	import { get } from 'svelte/store';

	import DynamicForm from './DynamicForm.svelte';

	interface Props {
		schemasSelected: string[];
		currentProfile: ProfileObject;
		currentTitle: string;
		currentCuid: string;
		schemasReset: () => void;
		profileUpdated: () => void;
		user: string | null;
		sourceIndexUrl: string;
		sourceLibraryUrl: string;
		sourceIndexId: number | null;
	}

	let {
		schemasSelected,
		currentProfile = {},
		currentTitle = '',
		currentCuid = '',
		schemasReset,
		profileUpdated,
		user,
		sourceIndexUrl,
		sourceLibraryUrl,
		sourceIndexId
	}: Props = $props();

	let profilePreview: boolean = $state(false);
	let validationErrors: string[] = $state([]);
	let serviceError: string = $state('');
	let isSubmitting: boolean = $state(false);
	let top: HTMLDivElement | undefined = $state();

	let isDbOnline: boolean = $state(get(dbStatus));
	let schemas: Schema | null = $state(null);

	// Subscribe to dbStatus changes
	dbStatus.subscribe((value) => {
		isDbOnline = value;
	});

	// Use parseRef to retrieve the schema based on schemasSelected
	onMount(async () => {
		if (!sourceLibraryUrl) {
			toast.error('Please select a Source Index first.');
			return;
		}

		try {
			schemas = await parseRef(schemasSelected, sourceLibraryUrl);
		} catch (err) {
			toast.error(err as string);
			resetSchemas();
		}
	});

	function scrollToTop(): void {
		top?.scrollIntoView();
	}

	function resetSchemas(): void {
		schemasReset();
	}

	async function copyJsonToClipboard(): Promise<void> {
		try {
			const jsonString = JSON.stringify(
				{ linked_schemas: schemasSelected, ...currentProfile },
				null,
				2
			);
			await navigator.clipboard.writeText(jsonString);
			toast.success('JSON copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy JSON:', err);
			toast.error('Failed to copy JSON to clipboard');
		}
	}

	async function handleSubmit(event: SubmitEvent): Promise<void> {
		// TODO - determine if we really need to prevent the default form submission behavior
		event.preventDefault();
		isSubmitting = true;
		serviceError = '';
		const target = event.target as HTMLFormElement | null;
		if (target) {
			const formData = new FormData(target);
			const formDataObject: Record<string, string | string[]> = {};

			// Find all the fields that have multiple select
			const multipleSelects: Set<string> = new SvelteSet();
			const selects = target.querySelectorAll('select[multiple]');
			selects.forEach((select) => {
				const selectElement = select as HTMLSelectElement;
				multipleSelects.add(selectElement.name);
			});

			formData.forEach((value, key) => {
				if (multipleSelects.has(key)) {
					if (!formDataObject[key]) {
						formDataObject[key] = [];
					}
					(formDataObject[key] as string[]).push(value as string);
				} else if (typeof value === 'string') {
					// Only retain string values
					formDataObject[key] = value;
				}
			});

			currentProfile = generateSchemaInstance(schemas, formDataObject);

			const { errors } = await validateProfile(currentProfile, sourceIndexUrl);

			if (errors) {
				validationErrors = errors?.map(
					(error: { title: string; detail: string; source?: { pointer?: string } }) => {
						const pointer = error.source?.pointer || 'Unknown source';
						return `${error.title}: ${error.detail} (Source: ${pointer})`;
					}
				);
				scrollToTop();
			} else {
				validationErrors = [];
				profilePreview = true;
				toast.success('Profile is valid');
			}
		}
		isSubmitting = false;
	}

	async function saveAndPostProfile(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		isSubmitting = true;
		serviceError = '';

		if (!user) {
			toast.error('Please log in first.');
			isSubmitting = false;
			return;
		}

		if (!sourceIndexId) {
			toast.error('Please select a Source Index first.');
			isSubmitting = false;
			return;
		}

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const title = formData.get('title') as string;

		try {
			let result: { data: Profile; success: boolean; errors?: ValidationError[] } = {
				data: {} as Profile,
				success: false,
				errors: []
			};
			if (currentCuid) {
				const profileToUpdate: ProfileUpdateInput = {
					profile: JSON.stringify(currentProfile),
					title,
					lastUpdated: Math.floor(new Date().getTime() / 1000),
					sourceIndexId
				};
				result = await updateProfile(currentCuid, profileToUpdate);
			} else {
				const profileToSave: ProfileCreateInput = {
					linkedSchemas: JSON.stringify(schemasSelected),
					profile: JSON.stringify(currentProfile),
					title,
					lastUpdated: Math.floor(new Date().getTime() / 1000),
					nodeId: '',
					sourceIndexId
				};
				result = await createProfile(profileToSave);
			}

			if (result.errors) {
				validationErrors = result.errors.map(
					(error: { source?: { pointer?: string }; title: string; detail: string }) => {
						const pointer = error.source?.pointer || 'Unknown source';
						return `${error.title}: ${error.detail} (Source: ${pointer})`;
					}
				);
				// Scroll to the top of the page if there are validation errors
				if (validationErrors.length > 0) {
					scrollToTop();
				}
				profilePreview = false;
				return;
			}

			if (result.success) {
				toast.success('Profile saved successfully!');
			} else {
				throw new Error('Unknown error occurred while saving profile');
			}

			if (!result?.data?.cuid) {
				throw new Error('Profile cuid not found');
			}

			// Post profile URL to index and get node_id
			const { data, errors } = await postProfileToIndex(result.data.cuid, sourceIndexUrl);
			if (errors) {
				const errorMessages = Array.isArray(errors)
					? errors
							.map((error: { title: string; detail: string }) => `${error.title}: ${error.detail}`)
							.join(', ')
					: 'Unknown error occurred while posting profile to index';
				toast.error('Posting profile to index failed: ' + errorMessages);
			}
			console.log('Profile updated to index with node_id:', data?.node_id);

			if (!currentCuid && data?.node_id) {
				// Update profile with node_id in DB
				const { success, error: updateError } = await updateProfileNodeId(
					result.data.cuid,
					data?.node_id
				);
				if (success) {
					console.log('Profile updated with node_id successfully');
				} else {
					throw new Error(updateError || 'Unknown error occurred while updating node_id');
				}
			}

			// Reset to initial state
			profilePreview = false;
			resetSchemas();
		} catch (err) {
			console.error('Error saving and posting profile:', err);
			toast.error(err as string);
		}

		profileUpdated();
		isSubmitting = false;
	}
</script>

<div class="md:basis-2/3 md:order-first">
	{#if validationErrors.length > 0}
		<Alert variant="destructive" class="mb-4">
			<AlertDescription>
				<p class="font-medium">There were errors in your submission:</p>
				<ul class="list-disc list-inside mt-2">
					{#each validationErrors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			</AlertDescription>
		</Alert>
	{/if}

	<div bind:this={top}>
		<Card>
			<CardContent class="p-6">
				{#if serviceError != ''}
					<Alert variant="destructive" class="mb-6">
						<AlertDescription>
							{serviceError}
						</AlertDescription>
					</Alert>
				{/if}

				{#if !profilePreview}
					<div class="font-medium text-foreground mb-4">
						Editing profile with the following schemas
					</div>

					<div class="flex flex-wrap gap-2 mb-6">
						{#each schemasSelected as schema (schema)}
							<Badge variant="secondary" class="font-medium">{schema}</Badge>
						{/each}
					</div>

					<form onsubmit={handleSubmit}>
						<div class="mb-6">
							{#if schemas !== null}
								<DynamicForm {schemas} {currentProfile} />
							{/if}
						</div>
						<div class="flex gap-4 justify-center">
							<Button type="submit" disabled={isSubmitting} class="font-semibold">
								{#if isSubmitting}
									Loading...
								{:else}
									Validate
								{/if}
							</Button>
							<Button
								type="button"
								variant="secondary"
								onclick={resetSchemas}
								class="font-semibold"
							>
								Reset
							</Button>
						</div>
					</form>
				{/if}

				{#if profilePreview}
					<Card class="mb-6 bg-muted">
						<CardContent class="p-4">
							<pre class="text-sm whitespace-pre-wrap break-all">{JSON.stringify(
									{ linked_schemas: schemasSelected, ...currentProfile },
									null,
									2
								)}</pre>
						</CardContent>
					</Card>

					<div class="flex justify-center gap-4 mb-6">
						<Button
							onclick={() => (profilePreview = false)}
							disabled={isSubmitting}
							variant="outline"
							class="font-semibold"
						>
							Continue Editing
						</Button>
						<Button
							onclick={copyJsonToClipboard}
							disabled={isSubmitting}
							variant="secondary"
							class="font-semibold"
						>
							Copy JSON
						</Button>
					</div>

					<form onsubmit={saveAndPostProfile} class="space-y-6">
						<div class="space-y-2">
							<Label for="title" class="text-sm font-medium">Title</Label>
							<Input
								id="title"
								name="title"
								type="text"
								value={currentTitle}
								required
								class="w-full"
							/>
						</div>
						<div class="flex justify-center">
							<Button type="submit" disabled={!isDbOnline || isSubmitting} class="font-semibold">
								Save & Post
							</Button>
						</div>
					</form>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
