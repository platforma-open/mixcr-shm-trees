<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useApp } from '../app';
import { PTableColumnSpec } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlBlockPage, PlBtnGhost, PlDataTableSettings, PlEditableTitle, PlTableFilters, PTableRowKey } from '@platforma-sdk/ui-vue';

const app = useApp<`/basket?id=${string}`>();

const basketIdx = computed(() => app.model.ui.baskets.findIndex(it => it.id === app.queryParams.id));
const basket = computed({
  get: () => app.model.ui.baskets[basketIdx.value],
  set: (value) => app.model.ui.baskets[basketIdx.value] = value
});

const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: 'ptable',
  pTable: app.model.outputs.treeNodesPerBasket?.[basket.value.id]
}));
const columns = ref<PTableColumnSpec[]>([]);
const tableInstance = ref<PlAgDataTableController>();

const data = reactive<{
  selectedRows: PTableRowKey[]
}>({
  selectedRows: []
})

// // @TODO transfer to SDK
// function ensureSimpleValue(v: PTableValue): string | number {
//   if (isPTableAbsent(v) || v === null)
//     throw new Error(`Unexpected value: ${v}`);
//   return v;
// }
// function ensureNumber(v: PTableValue): number {
//   if (isPTableAbsent(v) || v === null || typeof v === 'string')
//     throw new Error(`Unexpected value type: ${typeof v}`);
//   return v;
// }
// function ensureString(v: PTableValue): string {
//   if (isPTableAbsent(v) || v === null || typeof v === 'number')
//     throw new Error(`Unexpected value type: ${typeof v}`);
//   return v;
// }

// function keyToNodeId(key: PTableRowKey): FullNodeId {
//   if (key.length === 6) {
//     return {
//       donorId: ensureSimpleValue(key[1]),
//       treeId: ensureNumber(key[2]),
//       subtreeId: String(ensureNumber(key[3])),
//       nodeId: ensureNumber(key[4]),
//     }
//   } else if (key.length === 5) {
//     return {
//       donorId: ensureSimpleValue(key[1]),
//       treeId: ensureNumber(key[2]),
//       nodeId: ensureNumber(key[3])
//     }
//   } else
//     throw new Error(`Unexpected key format: ${JSON.stringify(key)}`)
// }

function deleteFromBasket() {
  // data.nodesToAdd = data.selectedRows.map(r => keyToNodeId(r));
}
</script>

<template :key="basket?.id ?? ''">
  <PlBlockPage>
    <template #title>
      <PlEditableTitle max-width="600px" placeholder="Basket ..." :max-length="40" v-model="basket.name" />
    </template>
    <template #append>
      <PlBtnGhost v-if="data.selectedRows.length > 0" @click="deleteFromBasket()" icon="delete-bin">
        Delete Selected Nodes
      </PlBtnGhost>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="basket.tableState.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
    </template>
    <PlAgDataTable v-model="basket.tableState.tableState" v-model:selected-rows="data.selectedRows"
      :settings="tableSettings" client-side-model show-export-button show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />
  </PlBlockPage>
</template>
