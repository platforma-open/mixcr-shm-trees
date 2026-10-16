<script setup lang="ts">
import { getRawPlatformaInstance, PTableColumnSpec, pTableValue, PTableRowKey } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlAlert, PlBlockPage, PlBtnGhost, PlDataTableSettings, PlTableFilters } from '@platforma-sdk/ui-vue';
import { computed, reactive, ref, watch } from 'vue';
import { useApp } from '../app';
import { FullNodeId, isOutdatedRun } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import AddToBasketModal from './components/AddToBasketModal.vue';
import { ensureNumber, ensureSimpleValue } from '../util';
import canonicalize from 'canonicalize';

const emit = defineEmits<{ toGraph: [] }>()

const app = useApp<`/dendrogram?id=${string}`>();

const props = defineProps<{ initialSelection?: FullNodeId }>()

const dendroIdx = computed(() => app.model.ui.dendrograms.findIndex(it => it.id === app.queryParams.id));
const dendro = computed({
  get: () => app.model.ui.dendrograms[dendroIdx.value],
  set: (value) => app.model.ui.dendrograms[dendroIdx.value] = value
});

// Tree ids from another run may name other trees now, so the tree is not shown.
const outdated = computed(() => dendro.value !== undefined && isOutdatedRun(dendro.value, app.model.outputs.runKey));

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

watch(tableInstance, async (tiNew, tiOld) => {
  const table = app.model.outputs.treeNodesPerTree?.[dendro.value.id];
  if (tiOld === undefined && tiNew !== undefined && props.initialSelection !== undefined && table !== undefined) {
    const targetKeyStr = canonicalize(props.initialSelection);
    const platforma = getRawPlatformaInstance();
    const keyLength = props.initialSelection.subtreeId === undefined ? 5 : 6;
    const keyColumns: number[] = [];
    for (let k = 0; k < keyLength; ++k)
      keyColumns.push(k);
    const tData = await platforma.pFrameDriver.getData(table, keyColumns)
    const selection: PTableRowKey[] = []
    for (let i = 0; i < tData[0].data.length; ++i) {
      const key: PTableRowKey = [];
      for (let k = 0; k < keyLength; ++k)
        key.push(pTableValue(tData[k], i))
      if (canonicalize(keyToNodeId(key)) === targetKeyStr)
        selection.push(key);
    }
    data.selectedRows = selection;
    if (data.selectedRows.length > 0)
      tiNew.focusRow(data.selectedRows[0])
  }
})

function keyToNodeId(key: PTableRowKey): FullNodeId {
  if (key.length === 6) {
    return {
      donorId: ensureSimpleValue(key[0]),
      treeId: ensureNumber(key[1]),
      subtreeId: String(ensureNumber(key[2])),
      nodeId: ensureNumber(key[3]),
    }
  } else if (key.length === 5) {
    return {
      donorId: ensureSimpleValue(key[0]),
      treeId: ensureNumber(key[1]),
      nodeId: ensureNumber(key[2])
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
    <PlAlert v-if="outdated" type="warn">
      This tree was opened on an earlier run of the block, and trees are renumbered on every run.
      Delete it and open the tree again from the Trees Table.
    </PlAlert>
    <PlAgDataTable v-if="!outdated" v-model="dendro.tableState.tableState" v-model:selected-rows="data.selectedRows"
      :settings="tableSettings" client-side-model show-export-button show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />
    <AddToBasketModal v-if="data.nodesToAdd.length > 0" :nodes-to-add="data.nodesToAdd"
      @on-close="data.nodesToAdd = []" />
  </PlBlockPage>
</template>
