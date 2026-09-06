<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		CheckCircle2Icon,
		CopyIcon,
		Globe2Icon,
		PlusIcon,
		RefreshCwIcon,
		Trash2Icon
	} from '@lucide/svelte';

	let { data, form } = $props();
	let copied = $state<string | null>(null);

	async function copy(value: string, id: string) {
		await navigator.clipboard.writeText(value);
		copied = id;
		setTimeout(() => (copied = null), 1500);
	}
</script>

<AppSidebarLayout page="Custom domains" user={data.user} setting={data.setting}>
	<div class="space-y-5 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<p class="text-sm text-muted-foreground">Campaign delivery</p>
			<h1 class="mt-1 text-2xl font-semibold">Custom domains</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Map a verified hostname to an active campaign.
			</p>
		</header>

		{#if form?.error}
			<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{:else if form?.message}
			<div class="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
				{form.message}
			</div>
		{/if}

		<section class="border-b border-border pb-6">
			<h2 class="text-base font-semibold">Add hostname</h2>
			<form
				method="POST"
				action="?/create"
				class="mt-3 grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_auto]"
			>
				<Input name="hostname" required placeholder="go.example.com" />
				<select
					name="campaignId"
					required
					class="h-9 border border-input bg-background px-3 text-sm"
				>
					<option value="">Select campaign</option>
					{#each data.campaigns as campaign (campaign.id)}
						<option value={campaign.id}>{campaign.name} / {campaign.slug}</option>
					{/each}
				</select>
				<Button type="submit"><PlusIcon data-icon="inline-start" /> Add</Button>
			</form>
		</section>

		<section class="space-y-3">
			{#each data.domains as domain (domain.id)}
				<div class="border border-border p-4">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<Globe2Icon class="size-4" />
								<a
									href={`https://${domain.hostname}`}
									target="_blank"
									rel="noreferrer"
									class="font-medium hover:underline">{domain.hostname}</a
								>
								<Badge variant={domain.status === 'verified' ? 'default' : 'secondary'}
									>{domain.status}</Badge
								>
							</div>
							<p class="mt-1 text-sm text-muted-foreground">{domain.campaignName}</p>
						</div>
						<div class="flex gap-2">
							{#if domain.canManage && domain.status !== 'verified'}
								<form method="POST" action="?/verify" use:enhance>
									<input type="hidden" name="id" value={domain.id} /><Button
										type="submit"
										variant="outline"
										size="sm"><RefreshCwIcon data-icon="inline-start" /> Verify</Button
									>
								</form>
							{:else if domain.status === 'verified'}<span
									class="inline-flex items-center gap-1 text-sm text-muted-foreground"
									><CheckCircle2Icon class="size-4" /> Ready</span
								>{/if}
							{#if domain.canManage}<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={domain.id} /><Button
										type="submit"
										variant="ghost"
										size="icon"
										aria-label="Delete domain"><Trash2Icon /></Button
									>
								</form>{/if}
						</div>
					</div>
					{#if domain.canManage && domain.status !== 'verified'}
						<div class="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
							<div>
								<p class="text-xs text-muted-foreground">TXT name</p>
								<div class="mt-1 flex items-center gap-2">
									<code class="min-w-0 flex-1 truncate text-xs">{domain.dns.name}</code><Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Copy TXT name"
										onclick={() => copy(domain.dns.name, `${domain.id}-name`)}><CopyIcon /></Button
									>
								</div>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">TXT value</p>
								<div class="mt-1 flex items-center gap-2">
									<code class="min-w-0 flex-1 truncate text-xs">{domain.dns.value}</code><Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Copy TXT value"
										onclick={() => copy(domain.dns.value, `${domain.id}-value`)}
										><CopyIcon /></Button
									>
								</div>
							</div>
						</div>
					{/if}
					{#if domain.dns.routingTarget}
						<div class="mt-4 border-t border-border pt-4 text-sm">
							<span class="text-muted-foreground">CNAME</span>
							<code class="ml-2 text-xs break-all"
								>{domain.dns.routingName} → {domain.dns.routingTarget}</code
							>
						</div>
					{/if}
				</div>
			{:else}
				<div
					class="border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground"
				>
					<Globe2Icon class="mx-auto mb-3 size-6" />No custom domains configured.
				</div>
			{/each}
		</section>
	</div>
</AppSidebarLayout>
