<script setup lang="ts">
import { isPTableAbsent, PColumnValue, PTableColumnSpec, PTableValue } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlBlockPage, PlBtnGhost, PlDataTableSettings, PlDialogModal, PlTableFilters, PTableRowKey } from '@platforma-sdk/ui-vue';
import { computed, reactive, ref, watch } from 'vue';
import { useApp } from '../app';
import { FullNodeId } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import AddToBasketModal from './components/AddToBasketModal.vue';
import { ensureNumber, ensureSimpleValue } from '../util';

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
  nodesToAdd: FullNodeId[]
}>({
  selectedRows: [],
  nodesToAdd: []
})

function keyToNodeId(key: PTableRowKey): FullNodeId {
  if (key.length === 6) {
    return {
      donorId: ensureSimpleValue(key[1]),
      treeId: ensureNumber(key[2]),
      subtreeId: String(ensureNumber(key[3])),
      nodeId: ensureNumber(key[4]),
    }
  } else if (key.length === 5) {
    return {
      donorId: ensureSimpleValue(key[1]),
      treeId: ensureNumber(key[2]),
      nodeId: ensureNumber(key[3])
    }
  } else
    throw new Error(`Unexpected key format: ${JSON.stringify(key)}`)
}

function addToBasket() {
  data.nodesToAdd = data.selectedRows.map(r => keyToNodeId(r));
}

</script>

<template>
  <PlBlockPage>
    <template #title>{{ dendro.state.title }}</template>
    <template #append>
      <PlBtnGhost v-if="data.selectedRows.length > 0" @click="addToBasket()" icon="table-add">
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
    <AddToBasketModal v-if="data.nodesToAdd.length > 0" :nodes-to-add="data.nodesToAdd"
      @on-close="data.nodesToAdd = []" />
  </PlBlockPage>
</template>
