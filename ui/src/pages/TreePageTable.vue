<script setup lang="ts">
import { PTableColumnSpec } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlBlockPage, PlBtnGhost, PlDataTableSettings, PlDialogModal, PlTableFilters, PTableRowKey } from '@platforma-sdk/ui-vue';
import { computed, reactive, ref, watch } from 'vue';
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

const data = reactive<{
  selectedRows: PTableRowKey[],
  addingToBasketOpen: boolean
}>({
  selectedRows: [],
  addingToBasketOpen: false
})

</script>

<template>
  <PlBlockPage>
    <template #title>{{ dendro.state.title }}</template>
    <template #append>
      <PlBtnGhost v-if="data.selectedRows.length > 0" @click="data.addingToBasketOpen = true" icon="table-add">
        Add Nodes to Basket
      </PlBtnGhost>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="dendro.tableState.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
      <PlBtnGhost @click="emit('toGraph')" icon="graph">Go to Graph</PlBtnGhost>
    </template>
    <PlAgDataTable v-model="dendro.tableState.tableState" v-model:selected-rows="data.selectedRows"
      :settings="tableSettings" client-side-model show-export-button show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />
    <PlDialogModal v-model="data.addingToBasketOpen">
    </PlDialogModal>
  </PlBlockPage>
</template>
