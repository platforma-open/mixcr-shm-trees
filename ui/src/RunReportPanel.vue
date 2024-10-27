<script setup lang="ts">
import { computed, reactive } from 'vue';
import { debouncedRef } from '@vueuse/core';
import { PlBtnGroup, SimpleOption } from '@platforma-sdk/ui-vue';
import RunReportPanelReports from './RunReportPanelReports.vue';
import RunReportPanelLogs from './RunReportPanelLogs.vue';
import { TreeResultsMap } from './results';

const selectedDonor = defineModel<string | undefined>()

const resultMap = debouncedRef(TreeResultsMap, 300);
const donorData = computed(() => {
  if (selectedDonor.value === undefined || resultMap.value === undefined) return undefined;
  return resultMap.value.get(selectedDonor.value);
});

type TabId = "logs" | "reports";

const data = reactive<{
  currentTab: TabId
}>({
  currentTab: 'logs'
});

const tabOptions: SimpleOption<TabId>[] = [
  { value: 'logs', text: 'Log' },
  { value: 'reports', text: 'Reports' },
];
</script>

<template>
  <h3>Analysis summary for {{ selectedDonor }}</h3>
  <PlBtnGroup :options="tabOptions" v-model="data.currentTab" />
  <div v-if="selectedDonor !== undefined && donorData !== undefined" class="pl-scrollable">
    <RunReportPanelLogs v-if="data.currentTab === 'logs'" :donerResult="donorData" />
    <RunReportPanelReports v-else :donerResult="donorData" />
  </div>
  <div v-else>No sample selected</div>
</template>

<style lang="css" scoped>
.pl-scrollable {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  padding: 0 6px;
  margin: 0 -6px;
}
</style>
