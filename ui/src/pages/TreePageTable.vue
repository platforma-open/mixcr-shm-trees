<script setup lang="ts">
import {
  getRawPlatformaInstance,
  PlSelectionModel,
  pTableValue,
  PTableKey,
} from "@platforma-sdk/model";
import {
  PlAgDataTableV2,
  PlAgDataTableV2Controller,
  PlBlockPage,
  PlBtnGhost,
  type PlDataTableSettingsV2,
} from "@platforma-sdk/ui-vue";
import { computed, reactive, ref, watch } from "vue";
import { useApp } from "../app";
import { FullNodeId } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import AddToBasketModal from "./components/AddToBasketModal.vue";
import { ensureNumber, ensureSimpleValue } from "../util";
import canonicalize from "canonicalize";

const emit = defineEmits<{ toGraph: [] }>();

const app = useApp<`/dendrogram?id=${string}`>();

const props = defineProps<{ initialSelection?: FullNodeId }>();

const dendroIdx = computed(() =>
  app.model.data.dendrograms.findIndex((it) => it.id === app.queryParams.id),
);
const dendro = computed({
  get: () => app.model.data.dendrograms[dendroIdx.value],
  set: (value) => (app.model.data.dendrograms[dendroIdx.value] = value),
});

const tableSettings = computed<PlDataTableSettingsV2>(() => {
  const model = app.model.outputs.treeNodesPerTree?.[dendro.value.id];
  if (!model) return { sourceId: null, pending: true, error: null };
  return { sourceId: dendro.value.id, sheets: [], model };
});

const selection = ref<PlSelectionModel>({ axesSpec: [], selectedKeys: [] });
const tableInstance = ref<PlAgDataTableV2Controller>();

const data = reactive<{
  nodesToAdd: FullNodeId[];
}>({
  nodesToAdd: [],
});

watch(tableInstance, async (tiNew, tiOld) => {
  const model = app.model.outputs.treeNodesPerTree?.[dendro.value.id];
  const handle = model?.fullTableHandle;
  if (
    tiOld === undefined &&
    tiNew !== undefined &&
    props.initialSelection !== undefined &&
    handle !== undefined
  ) {
    const targetKeyStr = canonicalize(props.initialSelection);
    const platforma = getRawPlatformaInstance();
    const keyLength = props.initialSelection.subtreeId === undefined ? 5 : 6;
    const keyColumns = Array.from({ length: keyLength }, (_, k) => k);
    const spec = await platforma.pFrameDriver.getSpec(handle);
    const axesSpec = keyColumns.map((k) => {
      const s = spec[k];
      if (s.type !== "axis") throw new Error(`Expected axis column at index ${k}`);
      return s.id;
    });
    const tData = await platforma.pFrameDriver.getData(handle, keyColumns);
    const selectedKeys: PTableKey[] = [];
    for (let i = 0; i < tData[0].data.length; ++i) {
      const key: PTableKey = [];
      for (let k = 0; k < keyLength; ++k) key.push(pTableValue(tData[k], i));
      if (canonicalize(keyToNodeId(key)) === targetKeyStr) selectedKeys.push(key);
    }
    if (selectedKeys.length > 0) {
      await tiNew.updateSelection({ axesSpec, selectedKeys });
      await tiNew.focusRow(selectedKeys[0]);
    }
  }
});

function keyToNodeId(key: PTableKey): FullNodeId {
  if (key.length === 6) {
    return {
      donorId: ensureSimpleValue(key[0]),
      treeId: ensureNumber(key[1]),
      subtreeId: String(ensureNumber(key[2])),
      nodeId: ensureNumber(key[3]),
    };
  } else if (key.length === 5) {
    return {
      donorId: ensureSimpleValue(key[0]),
      treeId: ensureNumber(key[1]),
      nodeId: ensureNumber(key[2]),
    };
  } else throw new Error(`Unexpected key format: ${JSON.stringify(key)}`);
}

function addToBasket() {
  data.nodesToAdd = selection.value.selectedKeys.map((r) => keyToNodeId(r));
}
</script>

<template>
  <PlBlockPage>
    <template #title>{{ dendro.state.title }}</template>
    <template #append>
      <PlBtnGhost v-if="selection.selectedKeys.length > 0" @click="addToBasket()" icon="table-add">
        Add Nodes to Basket
      </PlBtnGhost>
      <PlBtnGhost @click="emit('toGraph')" icon="graph">Go to Graph</PlBtnGhost>
    </template>
    <PlAgDataTableV2
      v-model="dendro.tableState"
      v-model:selection="selection"
      :settings="tableSettings"
      show-export-button
      ref="tableInstance"
    />
    <AddToBasketModal
      v-if="data.nodesToAdd.length > 0"
      :nodes-to-add="data.nodesToAdd"
      @on-close="data.nodesToAdd = []"
    />
  </PlBlockPage>
</template>
