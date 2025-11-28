<script lang="ts">
	import type { ProfileObject } from '$lib/types/profile';
	import type { Schema } from '$lib/types/schema';

	import FormField from './FormField.svelte';

	interface Props {
		schemas: Schema;
		currentProfile: ProfileObject;
	}

	let { schemas, currentProfile }: Props = $props();
</script>

<div class="space-y-6">
	{#each Object.entries(schemas.properties) as [name, field] (name)}
		{#if name === 'linked_schemas'}
			<input type="hidden" name="linked_schemas" value={schemas?.metadata?.schema} />
		{:else}
			<FormField
				{name}
				fieldName={name}
				{field}
				requiredFields={schemas.required}
				isParentRequired={true}
				currentProfile={currentProfile[name]}
			/>
		{/if}
	{/each}
</div>
