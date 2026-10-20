<script setup lang="ts">
import { FullNodeId, InitialFullTableState, isCurrentRun, NodeBasket } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { PlId, uniquePlId } from '@platforma-sdk/model';
import { ListOption, PlBtnGhost, PlBtnPrimary, PlDialogModal, PlDropdown, PlTextField } from '@platforma-sdk/ui-vue';
import { computed, reactive, watch } from 'vue';
import { useApp } from '../../app';
import { inferNewName } from '../../util';
import { BaseColsService } from 'ag-grid-enterprise';

const app = useApp();

// runKey: run the nodes were selected on; nodes are added only while it is the run on show
const props = defineProps<{ nodesToAdd: FullNodeId[], runKey: string | undefined }>()

const emit = defineEmits<{
  onClose: [added: boolean]
}>()

const data = reactive<{
  targetBasket: PlId | '',
  newBasketName: string
}>({
  targetBasket: '', // create new basket by default
  newBasketName: ''
})

watch(() => app.model.ui.baskets.map(b => b.name), (e) => {
  data.newBasketName = inferNewName(e, i => `Basket #${i}`, data.newBasketName === '' ? undefined : data.newBasketName)
}, { immediate: true })

// Baskets from an earlier run hold ids of other trees, so new nodes go only to current ones.
const targetOptions = computed<ListOption<PlId | ''>[]>(() => [
  ...(app.model.ui.baskets ?? [])
    .filter(b => isCurrentRun(b, app.model.outputs.runKey))
    .map(b => ({ value: b.id, label: b.name })),
  { value: '', label: 'New basket...' }
])

const canAdd = computed(() => isCurrentRun(props, app.model.outputs.runKey) && (data.targetBasket !== '' || data.newBasketName !== ''))

function normalizeNodeSet(nodes: FullNodeId[]): FullNodeId[] {
  const normalized: FullNodeId[] = [];
  const set = new Set<string>();
  for (const key of nodes) {
    const sKey = JSON.stringify(key);
    if (set.has(sKey)) continue;
    set.add(sKey);
    normalized.push(key);
  }
  return normalized;
}

function runAdd() {
  const runKey = app.model.outputs.runKey;
  if (runKey === undefined || !isCurrentRun(props, runKey)) return;
  if (data.targetBasket === '') {
    const newBasket: NodeBasket = {
      id: uniquePlId(),
      comment: '',
      name: data.newBasketName,
      nodes: props.nodesToAdd,
      tableState: InitialFullTableState(),
      runKey
    }
    app.model.ui.baskets.push(newBasket);
  } else {
    const basket = app.model.ui.baskets.find(b => b.id === data.targetBasket)
    if (basket && isCurrentRun(basket, runKey)) {
      basket.nodes = normalizeNodeSet([...basket.nodes, ...props.nodesToAdd])
    }
  }
  emit('onClose', true)
}
</script>

<template>
  <PlDialogModal :model-value="true" @update:model-value="(v) => { if (!v) emit('onClose', false) }">
    <template #title>Add tree nodes to basket</template>
    <PlDropdown v-model="data.targetBasket" :options="targetOptions" label="Target Basket" />
    <PlTextField v-if="data.targetBasket === ''" v-model="data.newBasketName" label="New Basket Name" />
    <div v-if="app.model.outputs.runKey === undefined">Wait for the current run to start.</div>
    <!-- <template v-if="fileType === 'table'">
      <PlDropdown :options="columnOptions" v-model="data.sequenceColumn" clearable label="Sequence Column" />
      <PlDropdown :options="columnOptions" v-model="data.nameColumn" clearable label="Name Column" />
    </template>
    <PlLogView :value="importText" label="Import information" /> -->
    <template #actions>
      <PlBtnPrimary @click="runAdd" :disabled="!canAdd">
        Add
      </PlBtnPrimary>
      <PlBtnGhost @click="emit('onClose', false)">Cancel</PlBtnGhost>
    </template>
  </PlDialogModal>
</template>
