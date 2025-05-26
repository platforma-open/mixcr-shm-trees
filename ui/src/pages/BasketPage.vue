<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useApp } from '../app';
import { PTableColumnSpec, PTableRowKey } from '@platforma-sdk/model';
import { PlAgDataTable, PlAgDataTableController, PlAgDataTableToolsPanel, PlBlockPage, PlBtnGhost, PlBtnPrimary, PlBtnSecondary, PlDataTableSettings, PlDialogModal, PlEditableTitle, PlTableFilters } from '@platforma-sdk/ui-vue';
import { ensureNumber, ensureSimpleValue } from '../util';
import canonicalize from 'canonicalize';
import { FullNodeId } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const app = useApp<'/' | `/basket?id=${string}`>();

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
  selectedRows: PTableRowKey[],
  nodesToDelete?: FullNodeId[],
  showDeleteBasketConfirmation: boolean
}>({
  selectedRows: [],
  showDeleteBasketConfirmation: false
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

function beginDeleteFromBasket() {
  data.nodesToDelete = data.selectedRows.map(r => keyToNodeId(r));
}

function deleteNodes() {
  if (data.nodesToDelete === undefined) return;
  const toDeletSet = new Set(data.nodesToDelete.map(n => canonicalize(n)!))
  basket.value.nodes = basket.value.nodes.filter(n => !toDeletSet.has(canonicalize(n)!))
  data.nodesToDelete = undefined;
}

function deleteBasket() {
  app.model.ui.baskets = app.model.ui.baskets.filter(it => it.id !== app.queryParams.id)
  app.navigateTo('/');
}
</script>

<template :key="basket?.id ?? ''">
  <PlBlockPage>
    <template #title>
      <PlEditableTitle max-width="600px" placeholder="Basket ..." :max-length="40" v-model="basket.name" />
    </template>
    <template #append>
      <PlBtnGhost v-if="data.selectedRows.length > 0" @click="beginDeleteFromBasket()" icon="delete-bin">
        Delete Selected Nodes
      </PlBtnGhost>
      <PlBtnGhost v-else @click="data.showDeleteBasketConfirmation = true" icon="delete-bin">
        Delete This Basket
      </PlBtnGhost>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="basket.tableState.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
    </template>
    <PlAgDataTable v-model="basket.tableState.tableState" v-model:selected-rows="data.selectedRows"
      :settings="tableSettings" client-side-model show-export-button show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />

    <PlDialogModal v-if="data.nodesToDelete !== undefined" :model-value="true"
      @update:model-value="(v) => { if (!v) data.nodesToDelete = undefined }">
      <template #title>Confirm delete of {{ data.nodesToDelete.length }} nodes</template>
      <template #actions>
        <PlBtnPrimary @click="() => deleteNodes()">Delete</PlBtnPrimary>
        <PlBtnSecondary @click="() => data.nodesToDelete = undefined">Cancel</PlBtnSecondary>
      </template>
    </PlDialogModal>

    <PlDialogModal v-model="data.showDeleteBasketConfirmation">
      <template #title>Confirm delete of "{{ basket.name }}" basket</template>
      <template #actions>
        <PlBtnPrimary @click="() => deleteBasket()">Delete</PlBtnPrimary>
        <PlBtnSecondary @click="() => data.showDeleteBasketConfirmation = false">Cancel</PlBtnSecondary>
      </template>
    </PlDialogModal>
  </PlBlockPage>
</template>
