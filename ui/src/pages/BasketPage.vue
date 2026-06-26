<script setup lang="ts">
import { computed, ref } from "vue";
import { useApp } from "../app";
import { PlSelectionModel, PTableKey } from "@platforma-sdk/model";
import {
  PlAgDataTableV2,
  PlBlockPage,
  PlBtnGhost,
  PlBtnPrimary,
  PlBtnSecondary,
  PlDialogModal,
  PlEditableTitle,
  type PlDataTableSettingsV2,
} from "@platforma-sdk/ui-vue";
import { ensureNumber, ensureSimpleValue } from "../util";
import canonicalize from "canonicalize";
import { FullNodeId } from "@platforma-open/milaboratories.mixcr-shm-trees.model";

const app = useApp<"/" | `/basket?id=${string}`>();

const basketIdx = computed(() =>
  app.model.data.baskets.findIndex((it) => it.id === app.queryParams.id),
);
const basket = computed({
  get: () => app.model.data.baskets[basketIdx.value],
  set: (value) => (app.model.data.baskets[basketIdx.value] = value),
});

const tableSettings = computed<PlDataTableSettingsV2>(() => {
  const model = app.model.outputs.treeNodesPerBasket?.[basket.value.id];
  if (!model) return { sourceId: null, pending: true, error: null };
  return { sourceId: basket.value.id, sheets: [], model };
});

const selection = ref<PlSelectionModel>({ axesSpec: [], selectedKeys: [] });
const nodesToDelete = ref<FullNodeId[] | undefined>();
const showDeleteBasketConfirmation = ref(false);

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

function beginDeleteFromBasket() {
  nodesToDelete.value = selection.value.selectedKeys.map((r) => keyToNodeId(r));
}

function deleteNodes() {
  if (nodesToDelete.value === undefined) return;
  const toDeleteSet = new Set(nodesToDelete.value.map((n) => canonicalize(n)!));
  basket.value.nodes = basket.value.nodes.filter((n) => !toDeleteSet.has(canonicalize(n)!));
  nodesToDelete.value = undefined;
}

function deleteBasket() {
  app.model.data.baskets = app.model.data.baskets.filter((it) => it.id !== app.queryParams.id);
  app.navigateTo("/");
}
</script>

<template :key="basket?.id ?? ''">
  <PlBlockPage>
    <template #title>
      <PlEditableTitle
        max-width="600px"
        placeholder="Basket ..."
        :max-length="40"
        v-model="basket.name"
      />
    </template>
    <template #append>
      <PlBtnGhost
        v-if="selection.selectedKeys.length > 0"
        @click="beginDeleteFromBasket()"
        icon="delete-bin"
      >
        Delete Selected Nodes
      </PlBtnGhost>
      <PlBtnGhost v-else @click="showDeleteBasketConfirmation = true" icon="delete-bin">
        Delete This Basket
      </PlBtnGhost>
    </template>
    <PlAgDataTableV2
      v-model="basket.tableState"
      v-model:selection="selection"
      :settings="tableSettings"
      show-export-button
    />

    <PlDialogModal
      v-if="nodesToDelete !== undefined"
      :model-value="true"
      @update:model-value="
        (v) => {
          if (!v) nodesToDelete = undefined;
        }
      "
    >
      <template #title>Confirm delete of {{ nodesToDelete.length }} nodes</template>
      <template #actions>
        <PlBtnPrimary @click="() => deleteNodes()">Delete</PlBtnPrimary>
        <PlBtnSecondary @click="() => (nodesToDelete = undefined)">Cancel</PlBtnSecondary>
      </template>
    </PlDialogModal>

    <PlDialogModal v-model="showDeleteBasketConfirmation">
      <template #title>Confirm delete of "{{ basket.name }}" basket</template>
      <template #actions>
        <PlBtnPrimary @click="() => deleteBasket()">Delete</PlBtnPrimary>
        <PlBtnSecondary @click="() => (showDeleteBasketConfirmation = false)"
          >Cancel</PlBtnSecondary
        >
      </template>
    </PlDialogModal>
  </PlBlockPage>
</template>
