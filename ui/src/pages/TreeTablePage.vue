<script setup lang="ts">
import { AxisId, PTableKey } from "@platforma-sdk/model";
import { PlAgDataTableV2, PlBlockPage, usePlDataTableSettingsV2 } from "@platforma-sdk/ui-vue";
import { addDendrogram } from "../addDendrogram";
import { useApp } from "../app";

const app = useApp();

const tableSettings = usePlDataTableSettingsV2({
  model: () => app.model.outputs.trees,
});

// Keys reaching the row handler are concrete (no NA / null) axis values.
function isConcreteKey(key: PTableKey): key is (string | number)[] {
  return key.every((k) => typeof k === "number" || typeof k === "string");
}

const onRowDoubleClicked = (keys?: PTableKey) => {
  if (!keys || !isConcreteKey(keys)) return;
  const donorId = keys[0];
  const treeId = Number(keys[1]);
  const subtreeId = keys.length > 2 ? String(keys[2]) : undefined;
  addDendrogram("Tree / " + String(keys[0]) + " / " + treeId, donorId, treeId, subtreeId);
};

const treeIdAxis: AxisId = {
  type: "Long",
  name: "pl7.app/dendrogram/treeId",
};
</script>

<template>
  <PlBlockPage>
    <template #title>Trees Table</template>
    <PlAgDataTableV2
      v-model="app.model.data.treeTableState"
      :settings="tableSettings"
      :show-cell-button-for-axis-id="treeIdAxis"
      show-export-button
      @cell-button-clicked="onRowDoubleClicked"
    />
  </PlBlockPage>
</template>
