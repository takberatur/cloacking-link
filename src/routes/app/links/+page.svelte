<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { enhance } from '$app/forms';
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { confirmDelete, ConfirmDeleteDialog } from '$lib/components/ui/confirm-delete-dialog';
	import {
		CheckIcon,
		CopyIcon,
		EyeIcon,
		PencilIcon,
		PlusIcon,
		SearchIcon,
		Trash2Icon
	} from '@lucide/svelte';
	import { alertDialog } from '@/stores/alert-dialog.svelte.js';

	let { data, form } = $props();
	let copiedCampaignId = $state<string | null>(null);

	const dateFormatter = new Intl.DateTimeFormat('en', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});

	function pageUrl(page: number) {
		const params = new SvelteURLSearchParams();
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

	async function copyPublicUrl(campaignId: string, slug: string) {
		await navigator.clipboard.writeText(`${data.publicBaseUrl}/r/${slug}`);
		copiedCampaignId = campaignId;
		setTimeout(() => {
			if (copiedCampaignId === campaignId) copiedCampaignId = null;
		}, 1600);
	}

	async function handleDelete(campaign?: (typeof data.campaigns.items)[0]) {
		if (!campaign) return;

		try {
			const res = await fetch(`/api/campaign/${campaign.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});
			if (!res.ok) throw new Error(res.statusText || 'Failed to delete campaign');

			data.campaigns.items = data.campaigns.items.filter((p) => p.id !== campaign.id);

			await invalidateAll();
		} catch (error) {
			alertDialog.error(error instanceof Error ? error.message : 'Unknown error');
		}
	}
</script>

<AppSidebarLayout page="Campaigns" user={data.user} setting={data.setting}>
	<ConfirmDeleteDialog />
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
				{#each ['draft', 'active', 'paused', 'archived'] as status, i (i)}
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
								<p class="mt-0.5 font-mono text-xs text-muted-foreground">/r/{campaign.slug}</p>
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
										type="button"
										variant="outline"
										size="icon"
										aria-label="Copy public URL"
										title={copiedCampaignId === campaign.id ? 'Copied' : 'Copy public URL'}
										onclick={() => copyPublicUrl(campaign.id, campaign.slug)}
										>{#if copiedCampaignId === campaign.id}<CheckIcon />{:else}<CopyIcon
											/>{/if}</Button
									>
									<Button
										href="/app/links/{campaign.id}"
										variant="outline"
										size="icon"
										aria-label="View campaign"
										title="View"><EyeIcon /></Button
									>
									<Button
										href="/app/links/{campaign.id}/edit"
										variant="default"
										size="icon"
										aria-label="Edit campaign"
										title="Edit"><PencilIcon /></Button
									>
									<Button
										type="button"
										variant="destructive"
										size="icon"
										aria-label="Delete campaign"
										title="Delete"
										onclick={() => {
											confirmDelete({
												title: 'Delete campaign',
												description: `Delete ${campaign.name}?`,
												onConfirm: async () => {
													await handleDelete(campaign);
												}
											});
										}}
									>
										<Trash2Icon />
									</Button>
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
