<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { EyeIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from '@lucide/svelte';

	let { data, form } = $props();

	const dateFormatter = new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});

	function pageUrl(page: number) {
		const params = new URLSearchParams();
		if (data.filters.query) params.set('q', data.filters.query);
		if (data.filters.status) params.set('status', data.filters.status);
		if (data.filters.from) params.set('from', data.filters.from);
		if (data.filters.to) params.set('to', data.filters.to);
		params.set('page', String(page));
		params.set('pageSize', String(data.campaigns.pageSize));
		return `?${params.toString()}`;
	}

	function statusVariant(status: string) {
		if (status === 'active') return 'default';
		if (status === 'paused') return 'secondary';
		if (status === 'archived') return 'outline';
		return 'ghost';
	}
</script>

<AppSidebarLayout page="Campaigns" user={data.user} setting={data.setting}>
	<div class="space-y-5 px-1 sm:px-3">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p class="text-sm text-muted-foreground">Link management</p>
				<h1 class="mt-1 text-2xl font-semibold">Campaigns</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					{data.campaigns.total} campaigns in your workspace
				</p>
			</div>
			<Button href="/app/links/add"><PlusIcon data-icon="inline-start" /> Add campaign</Button>
		</div>

		{#if form?.error}
			<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				role="alert"
			>
				{form.error}
			</div>
		{:else if form?.success}
			<div class="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
				{form.message}
			</div>
		{/if}

		<form
			method="GET"
			class="grid gap-3 border-y border-border py-4 md:grid-cols-[minmax(220px,1fr)_160px_150px_150px_auto]"
		>
			<label class="relative">
				<span class="sr-only">Search campaigns</span>
				<SearchIcon
					class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
				/>
				<input
					name="q"
					value={data.filters.query}
					placeholder="Search name or slug"
					class="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm outline-none focus:ring-3"
				/>
			</label>
			<select
				name="status"
				aria-label="Status"
				class="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
			>
				<option value="">All statuses</option>
				{#each ['draft', 'active', 'paused', 'archived'] as status}
					<option value={status} selected={data.filters.status === status}
						>{status[0].toUpperCase() + status.slice(1)}</option
					>
				{/each}
			</select>
			<input
				name="from"
				type="date"
				value={data.filters.from}
				aria-label="Created from"
				class="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
			/>
			<input
				name="to"
				type="date"
				value={data.filters.to}
				aria-label="Created until"
				class="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
			/>
			<Button type="submit" variant="outline">Apply filters</Button>
		</form>

		<div class="overflow-hidden rounded-md border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Campaign</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Routing</Table.Head>
						<Table.Head>Destinations</Table.Head>
						<Table.Head>Updated</Table.Head>
						<Table.Head class="w-36 text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.campaigns.items as campaign (campaign.id)}
						<Table.Row>
							<Table.Cell>
								<a href="/app/links/{campaign.id}" class="font-medium hover:underline"
									>{campaign.name}</a
								>
								<p class="mt-0.5 font-mono text-xs text-muted-foreground">/{campaign.slug}</p>
							</Table.Cell>
							<Table.Cell
								><Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge
								></Table.Cell
							>
							<Table.Cell>
								<p class="text-sm capitalize">{campaign.redirectType}</p>
								<p class="text-xs text-muted-foreground capitalize">{campaign.rotationStrategy}</p>
							</Table.Cell>
							<Table.Cell>{campaign.destinationCount}</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground"
								>{dateFormatter.format(new Date(campaign.updatedAt))}</Table.Cell
							>
							<Table.Cell>
								<div class="flex justify-end gap-1">
									<Button
										href="/app/links/{campaign.id}"
										variant="ghost"
										size="icon"
										aria-label="View campaign"
										title="View"><EyeIcon /></Button
									>
									<Button
										href="/app/links/{campaign.id}/edit"
										variant="ghost"
										size="icon"
										aria-label="Edit campaign"
										title="Edit"><PencilIcon /></Button
									>
									<form
										method="POST"
										action="?/delete"
										use:enhance
										onsubmit={(event) => {
											if (!confirm(`Delete ${campaign.name}?`)) event.preventDefault();
										}}
									>
										<input type="hidden" name="campaignId" value={campaign.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon"
											aria-label="Delete campaign"
											title="Delete"><Trash2Icon /></Button
										>
									</form>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-40 text-center">
								<p class="font-medium">No campaigns found</p>
								<p class="mt-1 text-sm text-muted-foreground">
									Create a campaign or adjust your filters.
								</p>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm text-muted-foreground">
				Page {data.campaigns.page} of {data.campaigns.totalPages}
			</p>
			<div class="flex gap-2">
				<Button
					href={pageUrl(data.campaigns.page - 1)}
					variant="outline"
					disabled={data.campaigns.page <= 1}>Previous</Button
				>
				<Button
					href={pageUrl(data.campaigns.page + 1)}
					variant="outline"
					disabled={data.campaigns.page >= data.campaigns.totalPages}>Next</Button
				>
			</div>
		</div>
	</div>
</AppSidebarLayout>
