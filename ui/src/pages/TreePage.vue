<script setup lang="ts">
import { InitialFullTableState } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { computed, ref } from 'vue';
import { useApp } from '../app';
import TreePageTable from './TreePageTable.vue';
import TreePageGraph from './TreePageGraph.vue';

const app = useApp<`/dendrogram?id=${string}`>();

const dendroIdx = computed(() => app.model.ui.dendrograms.findIndex(it => it.id === app.queryParams.id));
const dendro = computed({
  get: () => app.model.ui.dendrograms[dendroIdx.value],
  set: (value) => app.model.ui.dendrograms[dendroIdx.value] = value
});

/** Migration */
(() => {
  if (dendro.value.tableState === undefined) dendro.value = { ...dendro.value, tableState: InitialFullTableState() }
  if (dendro.value.tab === undefined) dendro.value = { ...dendro.value, tab: 'Graph' }
  if (app.model.ui.baskets === undefined) app.model.ui.baskets = [];
})();
</script>

<template :key="dendro?.id ?? ''">
  <TreePageGraph v-if="dendro.tab === 'Graph'" @to-table="dendro.tab = 'Table'" />
  <TreePageTable v-else @to-graph="dendro.tab = 'Graph'" />
</template>

<style lang="css">
.container_graph_page {
  min-width: 900px;
  height: 1080px;
  overflow: hidden;
}
</style>