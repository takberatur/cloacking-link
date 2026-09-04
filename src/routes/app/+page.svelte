<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import AnalyticsFilter from '$lib/components/app/analytics-filter.svelte';
	import BreakdownList from '$lib/components/app/breakdown-list.svelte';
	import TrafficChart from '$lib/components/app/traffic-chart.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import {
		ActivityIcon,
		ArrowRightIcon,
		MousePointerClickIcon,
		RouteIcon,
		ShieldBanIcon,
		UsersIcon
	} from '@lucide/svelte';

	let { data } = $props();
	const numberFormatter = new Intl.NumberFormat('en');
	const analytics = $derived(data.analytics);
</script>

<AppSidebarLayout page="Dashboard" user={data.user} setting={data.setting}>
	<div class="space-y-6 px-1 sm:px-3">
		<header class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-sm text-muted-foreground">Traffic overview</p>
				<h1 class="mt-1 text-2xl font-semibold">Dashboard</h1>
			</div>
			<AnalyticsFilter from={analytics.range.from} to={analytics.range.to} />
		</header>

		<section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			<div class="rounded-md border border-border p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Total requests</p>
					<MousePointerClickIcon class="size-4 text-blue-600" />
				</div>
				<p class="mt-3 text-2xl font-semibold tabular-nums">
					{numberFormatter.format(analytics.summary.totalClicks)}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">Selected period</p>
			</div>
			<div class="rounded-md border border-border p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Unique visitors</p>
					<UsersIcon class="size-4 text-violet-600" />
				</div>
				<p class="mt-3 text-2xl font-semibold tabular-nums">
					{numberFormatter.format(analytics.summary.uniqueVisitors)}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">Distinct visitor IDs</p>
			</div>
			<div class="rounded-md border border-border p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Delivery rate</p>
					<RouteIcon class="size-4 text-emerald-600" />
				</div>
				<p class="mt-3 text-2xl font-semibold tabular-nums">{analytics.summary.deliveryRate}%</p>
				<p class="mt-1 text-xs text-muted-foreground">
					{numberFormatter.format(analytics.summary.deliveredClicks)} delivered
				</p>
			</div>
			<div class="rounded-md border border-border p-4">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Blocked</p>
					<ShieldBanIcon class="size-4 text-destructive" />
				</div>
				<p class="mt-3 text-2xl font-semibold tabular-nums">
					{numberFormatter.format(analytics.summary.blockedClicks)}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">{analytics.summary.blockRate}% of traffic</p>
			</div>
			<div class="rounded-md border border-border p-4 sm:col-span-2 xl:col-span-1">
				<div class="flex items-center justify-between gap-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Active campaigns</p>
					<ActivityIcon class="size-4 text-amber-600" />
				</div>
				<p class="mt-3 text-2xl font-semibold tabular-nums">
					{numberFormatter.format(analytics.summary.activeCampaigns)}
				</p>
				<p class="mt-1 text-xs text-muted-foreground">
					{numberFormatter.format(analytics.summary.botClicks)} bot requests
				</p>
			</div>
		</section>

		<section class="border-y border-border py-5">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold">Traffic timeline</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Delivered and blocked requests by UTC day
					</p>
				</div>
			</div>
			<TrafficChart data={analytics.timeline} />
		</section>

		<section>
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-base font-semibold">Top campaigns</h2>
					<p class="mt-1 text-sm text-muted-foreground">Highest traffic in the selected period</p>
				</div>
				<Button href="/app/links" variant="outline" size="sm">
					All campaigns <ArrowRightIcon data-icon="inline-end" />
				</Button>
			</div>
			<div class="overflow-hidden rounded-md border border-border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Campaign</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Requests</Table.Head>
							<Table.Head class="text-right">Unique</Table.Head>
							<Table.Head class="text-right">Blocked</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each analytics.topCampaigns as campaign (campaign.id)}
							<Table.Row>
								<Table.Cell>
									<a href="/app/links/{campaign.id}" class="font-medium hover:underline">
										{campaign.name}
									</a>
									<p class="mt-0.5 font-mono text-xs text-muted-foreground">/r/{campaign.slug}</p>
								</Table.Cell>
								<Table.Cell><Badge variant="outline">{campaign.status}</Badge></Table.Cell>
								<Table.Cell class="text-right tabular-nums"
									>{numberFormatter.format(campaign.clicks)}</Table.Cell
								>
								<Table.Cell class="text-right tabular-nums"
									>{numberFormatter.format(campaign.uniqueVisitors)}</Table.Cell
								>
								<Table.Cell class="text-right tabular-nums"
									>{numberFormatter.format(campaign.blocked)}</Table.Cell
								>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
									No campaign traffic in this period.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</section>

		<section class="grid gap-6 border-t border-border pt-5 lg:grid-cols-3">
			<div>
				<h2 class="mb-4 text-base font-semibold">Top countries</h2>
				<BreakdownList items={analytics.countries} />
			</div>
			<div>
				<h2 class="mb-4 text-base font-semibold">Devices</h2>
				<BreakdownList items={analytics.devices} />
			</div>
			<div>
				<h2 class="mb-4 text-base font-semibold">Browsers</h2>
				<BreakdownList items={analytics.browsers} />
			</div>
		</section>
	</div>
</AppSidebarLayout>
