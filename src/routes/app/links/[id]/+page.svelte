<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeftIcon,
		CheckIcon,
		CopyIcon,
		ExternalLinkIcon,
		PencilIcon,
		PowerIcon,
		Trash2Icon
	} from '@lucide/svelte';

	let { data, form } = $props();
	let copied = $state(false);

	const dateFormatter = new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short'
	});

	async function copyPublicUrl() {
		await navigator.clipboard.writeText(data.publicUrl);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}
</script>

<AppSidebarLayout page={data.campaign.name} user={data.user} setting={data.setting}>
	<div class="mx-auto w-full max-w-6xl space-y-6 px-1 sm:px-3">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<a
					href="/app/links"
					class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
					><ArrowLeftIcon class="size-4" /> Campaigns</a
				>
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<h1 class="text-2xl font-semibold">{data.campaign.name}</h1>
					<Badge variant={data.campaign.status === 'active' ? 'default' : 'secondary'}
						>{data.campaign.status}</Badge
					>
				</div>
				<a
					href={data.publicUrl}
					target="_blank"
					rel="noreferrer"
					class="mt-1 inline-flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground"
					>/r/{data.campaign.slug}<ExternalLinkIcon class="size-3" /></a
				>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button type="button" variant="outline" onclick={copyPublicUrl}
					>{#if copied}<CheckIcon data-icon="inline-start" /> Copied{:else}<CopyIcon
							data-icon="inline-start"
						/> Copy URL{/if}</Button
				>
				<form method="POST" action="?/toggleStatus" use:enhance>
					<input
						type="hidden"
						name="status"
						value={data.campaign.status === 'active' ? 'paused' : 'active'}
					/>
					<Button type="submit" variant="outline"
						><PowerIcon data-icon="inline-start" />
						{data.campaign.status === 'active' ? 'Pause' : 'Activate'}</Button
					>
				</form>
				<Button href="/app/links/{data.campaign.id}/edit"
					><PencilIcon data-icon="inline-start" /> Edit</Button
				>
			</div>
		</div>

		{#if data.created || data.updated}
			<div class="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
				Campaign {data.created ? 'created' : 'updated'} successfully.
			</div>
		{:else if form?.error}
			<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{/if}

		<section class="grid gap-5 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<p class="text-xs font-medium text-muted-foreground uppercase">Redirect</p>
				<p class="mt-1 text-sm font-semibold capitalize">{data.campaign.redirectType}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-muted-foreground uppercase">Rotation</p>
				<p class="mt-1 text-sm font-semibold capitalize">{data.campaign.rotationStrategy}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-muted-foreground uppercase">Bot protection</p>
				<p class="mt-1 text-sm font-semibold">
					{data.campaign.botProtectionEnabled ? 'Enabled' : 'Disabled'}
				</p>
			</div>
			<div>
				<p class="text-xs font-medium text-muted-foreground uppercase">Last updated</p>
				<p class="mt-1 text-sm font-semibold">
					{dateFormatter.format(new Date(data.campaign.updatedAt))}
				</p>
			</div>
		</section>

		<section>
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold">Destinations</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						{data.campaign.destinations.length} configured routes
					</p>
				</div>
			</div>
			<div class="space-y-3">
				{#each data.campaign.destinations as destination, index (destination.id)}
					<div
						class="grid gap-4 rounded-md border border-border p-4 md:grid-cols-[36px_minmax(220px,1fr)_120px_120px_100px] md:items-center"
					>
						<span
							class="flex size-8 items-center justify-center rounded bg-muted text-xs font-semibold"
							>{index + 1}</span
						>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-medium">{destination.name}</p>
								<Badge variant={destination.enabled ? 'outline' : 'secondary'}
									>{destination.enabled ? 'enabled' : 'disabled'}</Badge
								>
							</div>
							<a
								href={destination.url}
								target="_blank"
								rel="noreferrer"
								class="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
								>{destination.url}<ExternalLinkIcon class="size-3 shrink-0" /></a
							>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Platform</p>
							<p class="text-sm capitalize">{destination.platform}</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Traffic</p>
							<p class="text-sm">
								{data.campaign.rotationStrategy === 'percentage'
									? `${destination.weight}%`
									: data.campaign.rotationStrategy === 'priority'
										? `Priority ${destination.priority}`
										: 'Equal share'}
							</p>
						</div>
						<div>
							<p class="text-xs text-muted-foreground">Geo</p>
							<p class="text-sm capitalize">
								{destination.geoMode === 'all'
									? 'All'
									: `${destination.geoMode} ${destination.geoTargets.map((target) => target.countryCode).join(', ')}`}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<section class="grid gap-5 border-y border-border py-5 md:grid-cols-2">
			<div>
				<h2 class="text-base font-semibold">Fallback</h2>
				<p class="mt-1 text-sm break-all text-muted-foreground">
					{data.campaign.fallbackUrl ?? 'No fallback URL configured'}
				</p>
			</div>
			<div>
				<h2 class="text-base font-semibold">Traffic options</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Tracking {data.campaign.trackingEnabled ? 'on' : 'off'} · Query forwarding {data.campaign
						.preserveQueryParams
						? 'on'
						: 'off'} · Referrer {data.campaign.stripReferrer ? 'stripped' : 'preserved'}
				</p>
			</div>
		</section>

		<div class="flex justify-end pb-6">
			<form
				method="POST"
				action="?/delete"
				onsubmit={(event) => {
					if (!confirm(`Delete ${data.campaign.name}? This cannot be undone.`))
						event.preventDefault();
				}}
			>
				<Button type="submit" variant="destructive"
					><Trash2Icon data-icon="inline-start" /> Delete campaign</Button
				>
			</form>
		</div>
	</div>
</AppSidebarLayout>
