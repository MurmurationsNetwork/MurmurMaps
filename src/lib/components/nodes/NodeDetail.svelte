<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { isValidEmail, isValidUrl } from '$lib/utils/validators';
	import type { JSONSchema7 } from 'json-schema';

	let { nodeData, schema }: { nodeData: Record<string, unknown>; schema: JSONSchema7 } = $props();

	function getFieldInfo(key: string) {
		if (!schema || !schema.properties) {
			return { title: key, description: null };
		}

		const property = schema.properties[key];
		if (property && typeof property === 'object' && !Array.isArray(property)) {
			return {
				title: property.title || key,
				description: property.description || null
			};
		}

		return { title: key, description: null };
	}
</script>

<Tooltip.Provider>
	{#each Object.entries(nodeData) as [key, value] (key)}
		{#if key !== 'image' && key !== 'name'}
			{@const fieldInfo = getFieldInfo(key)}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					{#if fieldInfo.description}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<h4 class="text-base font-medium text-foreground cursor-help">
									{fieldInfo.title}
								</h4>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p class="max-w-xs text-sm">{fieldInfo.description}</p>
							</Tooltip.Content>
						</Tooltip.Root>
					{:else}
						<h4 class="text-base font-medium text-foreground">{fieldInfo.title}</h4>
					{/if}
				</div>
				<div class="text-sm">
					{#if Array.isArray(value)}
						{#if value.length === 1 && typeof value[0] !== 'object'}
							<span class="text-muted-foreground">{value[0]}</span>
						{:else}
							<ul class="ml-4 space-y-1 list-disc">
								{#each value as item (item)}
									<li class="text-muted-foreground">
										{#if typeof item === 'object' && item !== null}
											{#if Array.isArray(item)}
												<ul class="ml-4 mt-1 list-disc space-y-1">
													{#each item as subItem (subItem)}
														<li class="text-xs">
															{typeof subItem === 'object' && subItem !== null
																? JSON.stringify(subItem)
																: subItem}
														</li>
													{/each}
												</ul>
											{:else}
												<ul class="ml-4 mt-1 list-disc space-y-1">
													{#each Object.entries(item) as [subKey, subValue] (subKey)}
														<li class="text-xs">
															<span class="font-medium text-foreground">{subKey}:</span>
															{#if Array.isArray(subValue)}
																{#if subValue.length === 1 && typeof subValue[0] !== 'object'}
																	<span class="text-muted-foreground">{subValue[0]}</span>
																{:else}
																	<ul class="ml-4 mt-1 list-disc space-y-1">
																		{#each subValue as subSubItem (subSubItem)}
																			<li class="text-muted-foreground">
																				{typeof subSubItem === 'object' && subSubItem !== null
																					? JSON.stringify(subSubItem)
																					: subSubItem}
																			</li>
																		{/each}
																	</ul>
																{/if}
															{:else if typeof subValue === 'object' && subValue !== null}
																<span class="text-muted-foreground font-mono text-xs"
																	>{JSON.stringify(subValue)}</span
																>
															{:else if typeof subValue === 'string'}
																{#if isValidUrl(subValue)}
																	<a
																		href={subValue}
																		target="_blank"
																		rel="noopener noreferrer"
																		class="underline break-words">{subValue}</a
																	>
																{:else if isValidEmail(subValue)}
																	<a href={`mailto:${subValue}`} class="underline break-words"
																		>{subValue}</a
																	>
																{:else}
																	<span class="text-muted-foreground">{subValue}</span>
																{/if}
															{:else}
																<span class="text-muted-foreground">{subValue}</span>
															{/if}
														</li>
													{/each}
												</ul>
											{/if}
										{:else}
											{item}
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					{:else if typeof value === 'object' && value !== null}
						<ul class="ml-4 space-y-1 list-disc">
							{#each Object.entries(value) as [subKey, subValue] (subKey)}
								<li class="text-xs">
									<span class="font-medium text-foreground">{subKey}:</span>
									{#if Array.isArray(subValue)}
										{#if subValue.length === 1 && typeof subValue[0] !== 'object'}
											<span class="text-muted-foreground">{subValue[0]}</span>
										{:else}
											<ul class="ml-4 mt-1 list-disc space-y-1">
												{#each subValue as subSubItem (subSubItem)}
													<li class="text-muted-foreground">
														{typeof subSubItem === 'object' && subSubItem !== null
															? JSON.stringify(subSubItem)
															: subSubItem}
													</li>
												{/each}
											</ul>
										{/if}
									{:else if typeof subValue === 'object' && subValue !== null}
										<span class="text-muted-foreground font-mono text-xs"
											>{JSON.stringify(subValue)}</span
										>
									{:else if typeof subValue === 'string'}
										{#if isValidUrl(subValue)}
											<a
												href={subValue}
												target="_blank"
												rel="noopener noreferrer"
												class="underline break-words">{subValue}</a
											>
										{:else if isValidEmail(subValue)}
											<a href={`mailto:${subValue}`} class="underline break-words">{subValue}</a>
										{:else}
											<span class="text-muted-foreground">{subValue}</span>
										{/if}
									{:else}
										<span class="text-muted-foreground">{subValue}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{:else if typeof value === 'string'}
						{#if isValidUrl(value)}
							<a
								href={value}
								target="_blank"
								rel="noopener noreferrer"
								class="underline break-words">{value}</a
							>
						{:else if isValidEmail(value)}
							<a href={`mailto:${value}`} class="underline break-words">{value}</a>
						{:else}
							<span class="text-muted-foreground">{value}</span>
						{/if}
					{:else}
						<span class="text-muted-foreground">{value}</span>
					{/if}
				</div>
			</div>
		{/if}
	{/each}
</Tooltip.Provider>
