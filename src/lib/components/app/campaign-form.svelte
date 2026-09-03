<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { ArrowLeftIcon, PlusIcon, SaveIcon, Trash2Icon } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select/index.js';

	type Destination = {
		id?: string;
		name: string;
		url: string;
		type: 'affiliate' | 'cpa' | 'direct' | 'popunder';
		platform: 'generic' | 'amazon' | 'ebay' | 'shopee' | 'tiktok' | 'traveloka' | 'custom';
		enabled: boolean;
		weight: number;
		priority: number;
		geoMode: 'all' | 'include' | 'exclude';
		countries: string;
	};

	type Campaign = {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		status: 'draft' | 'active' | 'paused' | 'archived';
		redirectType: 'direct' | 'safelink' | 'deeplink';
		rotationStrategy: 'equal' | 'percentage' | 'priority';
		fallbackUrl: string | null;
		botProtectionEnabled: boolean;
		trackingEnabled: boolean;
		preserveQueryParams: boolean;
		stripReferrer: boolean;
		destinations: Array<{
			id: string;
			name: string;
			url: string;
			type: Destination['type'];
			platform: Destination['platform'];
			enabled: boolean;
			weight: number;
			priority: number;
			geoMode: Destination['geoMode'];
			geoTargets: Array<{ countryCode: string }>;
		}>;
	};

	let {
		campaign,
		form,
		submitLabel = 'Create campaign'
	}: {
		campaign?: Campaign;
		form?: { error?: string; validation?: { formErrors?: string[] } } | null;
		submitLabel?: string;
	} = $props();

	function blankDestination(): Destination {
		return {
			name: '',
			url: '',
			type: 'affiliate',
			platform: 'generic',
			enabled: true,
			weight: 100,
			priority: 0,
			geoMode: 'all',
			countries: ''
		};
	}

	let destinations = $state<Destination[]>(
		untrack(() => campaign)?.destinations.map((destination) => ({
			id: destination.id,
			name: destination.name,
			url: destination.url,
			type: destination.type,
			platform: destination.platform,
			enabled: destination.enabled,
			weight: destination.weight,
			priority: destination.priority,
			geoMode: destination.geoMode,
			countries: destination.geoTargets.map((target) => target.countryCode).join(', ')
		})) ?? [blankDestination()]
	);
	let rotationStrategy = $state<Campaign['rotationStrategy']>(
		untrack(() => campaign)?.rotationStrategy ?? 'equal'
	);
	let submitting = $state(false);

	const selectClass =
		'border-input bg-background focus:border-ring focus:ring-ring/30 h-9 w-full rounded-md border px-2.5 text-sm outline-none focus:ring-3';
	const behaviorOptions: Array<[string, string, boolean]> = untrack(() => [
		['trackingEnabled', 'Track analytics', campaign?.trackingEnabled ?? true],
		['botProtectionEnabled', 'Enable bot protection', campaign?.botProtectionEnabled ?? true],
		['preserveQueryParams', 'Forward query parameters', campaign?.preserveQueryParams ?? true],
		['stripReferrer', 'Strip referrer', campaign?.stripReferrer ?? false]
	]);

	function addDestination() {
		destinations.push(blankDestination());
	}

	function removeDestination(index: number) {
		if (destinations.length === 1) return;
		destinations.splice(index, 1);
	}

</script>

<form
	method="POST"
	class="mx-auto w-full max-w-6xl space-y-6"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	{#if form?.error}
		<div
			class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			role="alert"
		>
			<p class="font-medium">{form.error}</p>
			{#each form.validation?.formErrors ?? [] as message, i (i)}
				<p class="mt-1">{message}</p>
			{/each}
		</div>
	{/if}

	<section class="border-b border-border pb-6">
		<div class="mb-5">
			<h2 class="text-base font-semibold">Campaign details</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Name the campaign and configure its public short URL.
			</p>
		</div>
		<div class="grid gap-5 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="name">Campaign name</Label>
				<Input
					id="name"
					name="name"
					required
					maxlength={160}
					value={campaign?.name ?? ''}
					placeholder="Indonesia marketplace offers"
				/>
			</div>
			<div class="space-y-2">
				<Label for="slug">Custom slug</Label>
				<Input
					id="slug"
					name="slug"
					minlength={3}
					maxlength={64}
					value={campaign?.slug ?? ''}
					placeholder="Leave blank to generate automatically"
				/>
			</div>
			<div class="space-y-2 md:col-span-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					name="description"
					maxlength={1000}
					value={campaign?.description ?? ''}
					placeholder="Internal notes for your team"
				/>
			</div>
			<div class="space-y-2">
				<Label for="status">Status</Label>
				<Select.Root type="single" name="status" value={campaign?.status ?? 'draft'}>
					<Select.Trigger id="status" name="status" class="w-full capitalize">
						{campaign?.status ?? 'draft'}
					</Select.Trigger>
					<Select.Content class="w-full">
						<Select.Group>
							{#each ['draft', 'active', 'paused', 'archived'] as status (status)}
								<Select.Item value={status} label={status} class="capitalize">
									{status}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<Label for="redirectType">Redirect type</Label>
        <Select.Root type="single" name="redirectType" value={campaign?.redirectType ?? 'direct'}>
					<Select.Trigger id="redirectType" name="redirectType" class="w-full capitalize">
						{campaign?.redirectType ?? 'direct'}
					</Select.Trigger>
					<Select.Content class="w-full">
						<Select.Group>
							{#each ['direct', 'deeplink', 'safelink'] as redirectType (redirectType)}
								<Select.Item value={redirectType} label={redirectType} class="capitalize">
									{redirectType}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="space-y-2">
				<Label for="rotationStrategy">Rotation strategy</Label>
				<select
					id="rotationStrategy"
					name="rotationStrategy"
					class={selectClass}
					bind:value={rotationStrategy}
				>
					<option value="equal">Equal</option>
					<option value="percentage">Percentage</option>
					<option value="priority">Priority</option>
				</select>
			</div>
			<div class="space-y-2">
				<Label for="fallbackUrl">Fallback URL</Label>
				<Input
					id="fallbackUrl"
					name="fallbackUrl"
					type="url"
					value={campaign?.fallbackUrl ?? ''}
					placeholder="https://example.com/unavailable"
				/>
			</div>
		</div>
	</section>

	<section class="border-b border-border pb-6">
		<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="text-base font-semibold">Destinations</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Traffic will be assigned across these active URLs.
				</p>
			</div>
			<Button type="button" variant="outline" onclick={addDestination}>
				<PlusIcon data-icon="inline-start" /> Add destination
			</Button>
		</div>

		<div class="space-y-4">
			{#each destinations as destination, index (destination.id ?? index)}
				<div class="rounded-md border border-border bg-card p-4">
					<input type="hidden" name="destinationId" value={destination.id ?? ''} />
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<span
								class="flex size-7 items-center justify-center rounded bg-muted text-xs font-semibold"
								>{index + 1}</span
							>
							<label class="flex items-center gap-2 text-sm font-medium">
								<input
									type="checkbox"
									name="destinationEnabled"
									value={index}
									bind:checked={destination.enabled}
									class="size-4"
								/>
								Enabled
							</label>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							disabled={destinations.length === 1}
							onclick={() => removeDestination(index)}
							aria-label="Remove destination"
							title="Remove destination"
						>
							<Trash2Icon />
						</Button>
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div class="space-y-2 lg:col-span-2">
							<Label for="destination-name-{index}">Name</Label>
							<Input
								id="destination-name-{index}"
								name="destinationName"
								required
								maxlength={160}
								bind:value={destination.name}
								placeholder="Shopee mobile offer"
							/>
						</div>
						<div class="space-y-2">
							<Label for="destination-type-{index}">Offer type</Label>
							<select
								id="destination-type-{index}"
								name="destinationType"
								class={selectClass}
								bind:value={destination.type}
							>
								<option value="affiliate">Affiliate</option>
								<option value="cpa">CPA offer</option>
								<option value="direct">Direct</option>
								<option value="popunder">Popunder</option>
							</select>
						</div>
						<div class="space-y-2">
							<Label for="destination-platform-{index}">Platform</Label>
							<select
								id="destination-platform-{index}"
								name="destinationPlatform"
								class={selectClass}
								bind:value={destination.platform}
							>
								<option value="generic">Generic</option>
								<option value="amazon">Amazon</option>
								<option value="ebay">eBay</option>
								<option value="shopee">Shopee</option>
								<option value="tiktok">TikTok</option>
								<option value="traveloka">Traveloka</option>
								<option value="custom">Custom</option>
							</select>
						</div>
						<div class="space-y-2 md:col-span-2 lg:col-span-4">
							<Label for="destination-url-{index}">Destination URL</Label>
							<Input
								id="destination-url-{index}"
								name="destinationUrl"
								type="url"
								required
								bind:value={destination.url}
								placeholder="https://..."
							/>
						</div>
						<div class="space-y-2">
							<Label for="destination-weight-{index}"
								>{rotationStrategy === 'percentage' ? 'Percentage' : 'Weight'}</Label
							>
							<Input
								id="destination-weight-{index}"
								name="destinationWeight"
								type="number"
								min="1"
								max="10000"
								bind:value={destination.weight}
							/>
						</div>
						<div class="space-y-2">
							<Label for="destination-priority-{index}">Priority</Label>
							<Input
								id="destination-priority-{index}"
								name="destinationPriority"
								type="number"
								min="0"
								max="10000"
								bind:value={destination.priority}
							/>
						</div>
						<div class="space-y-2">
							<Label for="destination-geo-{index}">Geo targeting</Label>
							<select
								id="destination-geo-{index}"
								name="destinationGeoMode"
								class={selectClass}
								bind:value={destination.geoMode}
							>
								<option value="all">All countries</option>
								<option value="include">Only selected</option>
								<option value="exclude">Exclude selected</option>
							</select>
						</div>
						<div class="space-y-2">
							<Label for="destination-countries-{index}">Country codes</Label>
							<Input
								id="destination-countries-{index}"
								name="destinationCountries"
								readonly={destination.geoMode === 'all'}
								bind:value={destination.countries}
								placeholder="ID, SG, MY"
							/>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="border-b border-border pb-6">
		<h2 class="mb-4 text-base font-semibold">Traffic behavior</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each behaviorOptions as option, i (i)}
				<label
					class="flex items-center gap-3 rounded-md border border-border px-3 py-3 text-sm font-medium"
				>
					<input type="checkbox" name={option[0]} checked={option[2]} class="size-4" />
					{option[1]}
				</label>
			{/each}
		</div>
	</section>

	<div class="flex flex-wrap items-center justify-between gap-3 pb-6">
		<Button href={campaign ? `/app/links/${campaign.id}` : '/app/links'} variant="ghost">
			<ArrowLeftIcon data-icon="inline-start" /> Cancel
		</Button>
		<Button type="submit" disabled={submitting}>
			<SaveIcon data-icon="inline-start" />
			{submitting ? 'Saving...' : submitLabel}
		</Button>
	</div>
</form>
