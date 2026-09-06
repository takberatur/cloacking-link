<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowRightIcon, PlusIcon, UsersIcon } from '@lucide/svelte';
	let { data, form } = $props();
</script>

<AppSidebarLayout page="Teams" user={data.user} setting={data.setting}>
	<div class="mx-auto w-full max-w-6xl space-y-6 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<p class="text-sm text-muted-foreground">Workspace</p>
			<h1 class="mt-1 text-2xl font-semibold">Teams</h1>
			<p class="mt-1 text-sm text-muted-foreground">Shared campaign ownership and member access.</p>
		</header>
		{#if form?.error}<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>{/if}
		<section class="border-b border-border pb-6">
			<h2 class="text-base font-semibold">Create team</h2>
			<form method="POST" action="?/create" class="mt-3 flex max-w-xl gap-3">
				<Input
					name="name"
					minlength={2}
					maxlength={120}
					required
					placeholder="Performance marketing"
				/><Button type="submit"><PlusIcon data-icon="inline-start" /> Create</Button>
			</form>
		</section>
		<section>
			<h2 class="mb-4 text-base font-semibold">Your teams</h2>
			<div class="grid gap-3 md:grid-cols-2">
				{#each data.teams as team (team.id)}<a
						href={`/app/teams/${team.id}`}
						class="group border border-border p-4 hover:bg-muted/30"
						><div class="flex items-start justify-between gap-3">
							<div>
								<h3 class="font-medium">{team.name}</h3>
								<p class="mt-1 text-xs text-muted-foreground capitalize">
									{team.role} · {team.memberCount} members · {team.campaignCount} campaigns
								</p>
							</div>
							<ArrowRightIcon
								class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
							/>
						</div></a
					>{:else}<div
						class="border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground md:col-span-2"
					>
						<UsersIcon class="mx-auto mb-3 size-6" />No teams yet.
					</div>{/each}
			</div>
		</section>
	</div>
</AppSidebarLayout>
