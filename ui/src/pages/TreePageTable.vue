<script setup lang="ts">
import { PTableColumnSpec } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlBlockPage, PlBtnGhost, PlDataTableSettings, PlTableFilters } from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { useApp } from '../app';

const emit = defineEmits<{ toGraph: [] }>()

const app = useApp<`/dendrogram?id=${string}`>();

const dendroIdx = computed(() => app.model.ui.dendrograms.findIndex(it => it.id === app.queryParams.id));
const dendro = computed({
  get: () => app.model.ui.dendrograms[dendroIdx.value],
  set: (value) => app.model.ui.dendrograms[dendroIdx.value] = value
});

const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: 'ptable',
  pTable: app.model.outputs.treeNodesPerTree?.[dendro.value.id]
}));
const columns = ref<PTableColumnSpec[]>([]);
const tableInstance = ref<PlAgDataTableController>();

</script>

<template>
  <PlBlockPage>
    <template #title>{{ dendro.state.title }}</template>
    <template #append>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="dendro.tableState.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
      <PlBtnGhost @click="emit('toGraph')" icon="graph">Go to Graph</PlBtnGhost>
    </template>
    <PlAgDataTable v-model="dendro.tableState.tableState" :settings="tableSettings" show-export-button
      show-columns-panel @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />
  </PlBlockPage>
</template>
