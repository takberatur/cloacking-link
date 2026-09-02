<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';

	let { data } = $props();
</script>

<AppSidebarLayout page="Dashboard" user={data.user} setting={data.setting}>
	<div class="space-y-6 px-4 py-4 sm:px-6"></div>
</AppSidebarLayout>
