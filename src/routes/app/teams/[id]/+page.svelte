<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeftIcon, ExternalLinkIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	let { data, form } = $props();
	const canManage = $derived(data.membership.role === 'owner' || data.membership.role === 'admin');
</script>

<AppSidebarLayout page="Team detail" user={data.user} setting={data.setting}>
	<div class="space-y-5 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<a
				href="/app/teams"
				class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				><ArrowLeftIcon class="size-4" /> Teams</a
			>
			<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 class="text-2xl font-semibold">{data.team.name}</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Your role: <span class="capitalize">{data.membership.role}</span>
					</p>
				</div>
				<span class="font-mono text-xs text-muted-foreground">{data.team.slug}</span>
			</div>
		</header>
		{#if form?.error}<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>{/if}

		{#if canManage}<section class="border-b border-border pb-6">
				<h2 class="text-base font-semibold">Add member</h2>
				<form
					method="POST"
					action="?/add"
					class="mt-3 grid max-w-2xl gap-3 sm:grid-cols-[1fr_150px_auto]"
				>
					<Input name="email" type="email" required placeholder="member@example.com" /><select
						name="role"
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
						><option value="member">Member</option><option value="admin">Admin</option><option
							value="viewer">Viewer</option
						></select
					><Button type="submit"><PlusIcon data-icon="inline-start" /> Add</Button>
				</form>
			</section>{/if}

		<section class="border-b border-border pb-6">
			<h2 class="mb-3 text-base font-semibold">Members</h2>
			<div class="divide-y divide-border border border-border">
				{#each data.team.members as member (member.id)}<div
						class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
					>
						<div>
							<p class="text-sm font-medium">{member.user.name}</p>
							<p class="text-xs text-muted-foreground">{member.user.email}</p>
						</div>
						{#if canManage && member.role !== 'owner'}<div class="flex items-center gap-2">
								<form method="POST" action="?/role" class="flex gap-2">
									<input type="hidden" name="memberId" value={member.id} /><select
										name="role"
										class="h-8 rounded-md border border-input bg-background px-2 text-xs"
										value={member.role}
										><option value="admin">Admin</option><option value="member">Member</option
										><option value="viewer">Viewer</option></select
									><Button type="submit" size="sm" variant="outline">Update</Button>
								</form>
								<form method="POST" action="?/remove">
									<input type="hidden" name="memberId" value={member.id} /><Button
										type="submit"
										size="icon"
										variant="ghost"
										aria-label="Remove member"
										title="Remove member"><Trash2Icon /></Button
									>
								</form>
							</div>{:else}<span class="rounded bg-muted px-2 py-1 text-xs capitalize"
								>{member.role}</span
							>{/if}
					</div>{/each}
			</div>
		</section>

		<section>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-base font-semibold">Campaigns</h2>
				<Button href="/app/links/add" size="sm" variant="outline">Add campaign</Button>
			</div>
			<div class="divide-y divide-border border border-border">
				{#each data.team.campaigns as campaign (campaign.id)}<a
						href={`/app/links/${campaign.id}`}
						class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
						><div>
							<p class="text-sm font-medium">{campaign.name}</p>
							<p class="text-xs text-muted-foreground capitalize">
								{campaign.status} · {campaign.redirectType}
							</p>
						</div>
						<ExternalLinkIcon class="size-4 text-muted-foreground" /></a
					>{:else}<p class="px-4 py-8 text-center text-sm text-muted-foreground">
						No team campaigns yet.
					</p>{/each}
			</div>
		</section>
	</div>
</AppSidebarLayout>
