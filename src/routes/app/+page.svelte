<script lang="ts">
import { AppSidebarLayout } from "@/components/app";
  
  let { data } = $props();

</script>

<AppSidebarLayout page="Dashboard" user={data.user} setting={data.setting}>
  
</AppSidebarLayout>

