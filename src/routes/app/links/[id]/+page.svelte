<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import AnalyticsFilter from '$lib/components/app/analytics-filter.svelte';
	import BreakdownList from '$lib/components/app/breakdown-list.svelte';
	import TrafficChart from '$lib/components/app/traffic-chart.svelte';
	import * as Table from '$lib/components/ui/table';
	import {
		ArrowLeftIcon,
		CheckIcon,
		Code2Icon,
		CopyIcon,
		ExternalLinkIcon,
		FilePenLineIcon,
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
	const numberFormatter = new Intl.NumberFormat('en');

	async function copyPublicUrl() {
		await navigator.clipboard.writeText(data.publicUrl);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	function visitorPageUrl(page: number) {
		const params = new URLSearchParams({
			from: data.analytics.range.from,
			to: data.analytics.range.to,
			page: String(page)
		});
		return `?${params.toString()}`;
	}
</script>

<AppSidebarLayout page={data.campaign.name} user={data.user} setting={data.setting}>
	<div class="space-y-5 px-2 sm:px-4">
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
				{#if data.canEdit}
					<Button href="/app/links/{data.campaign.id}/embed" variant="outline">
						<Code2Icon data-icon="inline-start" /> Embed
					</Button>
					<Button href="/app/links/{data.campaign.id}/safelink" variant="outline">
						<FilePenLineIcon data-icon="inline-start" /> Safelink
					</Button>
				{/if}
				<Button type="button" variant="outline" onclick={copyPublicUrl}
					>{#if copied}<CheckIcon data-icon="inline-start" /> Copied{:else}<CopyIcon
							data-icon="inline-start"
						/> Copy URL{/if}</Button
				>
				{#if data.canEdit}<form method="POST" action="?/toggleStatus" use:enhance>
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
				{/if}
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
				<p class="mt-1 text-sm text-muted-foreground">
					Attribution {data.campaign.attributionEnabled
						? `${data.campaign.attributionSource ?? 'custom'} / ${data.campaign.attributionMedium ?? 'unspecified'}`
						: 'off'}
				</p>
			</div>
		</section>

		<section class="space-y-5 border-t border-border pt-5">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="text-base font-semibold">Campaign analytics</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Traffic and routing outcomes for this campaign
					</p>
				</div>
				<AnalyticsFilter from={data.analytics.range.from} to={data.analytics.range.to} />
			</div>

			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-md border border-border p-4">
					<p class="text-xs font-medium text-muted-foreground uppercase">Requests</p>
					<p class="mt-2 text-2xl font-semibold tabular-nums">
						{numberFormatter.format(data.analytics.summary.totalClicks)}
					</p>
				</div>
				<div class="rounded-md border border-border p-4">
					<p class="text-xs font-medium text-muted-foreground uppercase">Unique visitors</p>
					<p class="mt-2 text-2xl font-semibold tabular-nums">
						{numberFormatter.format(data.analytics.summary.uniqueVisitors)}
					</p>
				</div>
				<div class="rounded-md border border-border p-4">
					<p class="text-xs font-medium text-muted-foreground uppercase">Delivery rate</p>
					<p class="mt-2 text-2xl font-semibold tabular-nums">
						{data.analytics.summary.deliveryRate}%
					</p>
				</div>
				<div class="rounded-md border border-border p-4">
					<p class="text-xs font-medium text-muted-foreground uppercase">Blocked</p>
					<p class="mt-2 text-2xl font-semibold tabular-nums">
						{numberFormatter.format(data.analytics.summary.blockedClicks)}
					</p>
				</div>
			</div>

			<div class="border-y border-border py-5">
				<h3 class="text-sm font-semibold">Traffic timeline</h3>
				<p class="mt-1 mb-4 text-xs text-muted-foreground">Daily routing outcome in UTC</p>
				<TrafficChart data={data.analytics.timeline} />
			</div>

			<div class="grid gap-6 lg:grid-cols-3">
				<div>
					<h3 class="mb-4 text-sm font-semibold">Destination distribution</h3>
					<BreakdownList items={data.analytics.destinations} emptyLabel="No destination traffic" />
				</div>
				<div>
					<h3 class="mb-4 text-sm font-semibold">Blocked reasons</h3>
					<BreakdownList items={data.analytics.blockedReasons} emptyLabel="No blocked requests" />
				</div>
				<div>
					<h3 class="mb-4 text-sm font-semibold">Countries</h3>
					<BreakdownList items={data.analytics.countries} />
				</div>
			</div>
		</section>

		<section class="border-t border-border pt-5">
			<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold">Visitor events</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						{numberFormatter.format(data.analytics.visitors.total)} requests in this period
					</p>
				</div>
				<p class="text-xs text-muted-foreground">
					Page {data.analytics.visitors.page} of {data.analytics.visitors.totalPages}
				</p>
			</div>
			<div class="overflow-x-auto rounded-md border border-border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Time</Table.Head>
							<Table.Head>Visitor</Table.Head>
							<Table.Head>Outcome</Table.Head>
							<Table.Head>Destination / reason</Table.Head>
							<Table.Head>Client</Table.Head>
							<Table.Head class="text-right">Latency</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.analytics.visitors.items as event (event.id)}
							<Table.Row>
								<Table.Cell class="text-xs whitespace-nowrap text-muted-foreground">
									{dateFormatter.format(new Date(event.occurredAt))}
								</Table.Cell>
								<Table.Cell>
									<p class="font-mono text-xs">{event.visitorId?.slice(0, 8) ?? 'anonymous'}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										{event.countryCode ?? 'Unknown geo'}
									</p>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={event.outcome === 'blocked' ? 'destructive' : 'outline'}>
										{event.outcome}
									</Badge>
								</Table.Cell>
								<Table.Cell class="max-w-52 truncate text-sm">
									{event.destinationName ??
										event.blockReason ??
										(event.isBot ? 'Automatic bot protection' : 'None')}
								</Table.Cell>
								<Table.Cell>
									<p class="text-sm capitalize">
										{event.deviceType ?? 'unknown'} · {event.os ?? 'Unknown'}
									</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										{event.browser ?? 'Unknown browser'}
									</p>
								</Table.Cell>
								<Table.Cell class="text-right text-xs text-muted-foreground tabular-nums">
									{event.responseTimeMs === null ? '—' : `${event.responseTimeMs} ms`}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
									No visitor events in this period.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
			<div class="mt-4 flex justify-end gap-2">
				<Button
					href={visitorPageUrl(data.analytics.visitors.page - 1)}
					variant="outline"
					disabled={data.analytics.visitors.page <= 1}>Previous</Button
				>
				<Button
					href={visitorPageUrl(data.analytics.visitors.page + 1)}
					variant="outline"
					disabled={data.analytics.visitors.page >= data.analytics.visitors.totalPages}>Next</Button
				>
			</div>
		</section>

		{#if data.canEdit}<div class="flex justify-end pb-6">
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
			</div>{/if}
	</div>
</AppSidebarLayout>
