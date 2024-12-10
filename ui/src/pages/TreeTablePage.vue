<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import {
  AxisId,
  isPValue,
  PTableColumnSpec,
  PValue,
  safeConvertToPValue,
  toJsonSafePValue
} from '@platforma-sdk/model';
import {
  PlAgDataTable,
  PlAgDataTableToolsPanel,
  PlBlockPage,
  PlBtnGhost,
  PlMaskIcon24,
  PlTableFilters,
  type PlAgDataTableController,
  type PlDataTableSettings
} from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { addDendrogram } from '../addDendrogram';
import { useApp } from '../app';

const app = useApp();

/** UI state upgrader */ (() => {
  if ('filtersOpen' in app.model.ui) delete app.model.ui.filtersOpen;
  if (app.model.ui.filterModel === undefined) app.model.ui.filterModel = {};
})();

// TODO add default option to filter table by donor
const tableSettings = computed<PlDataTableSettings | undefined>(() =>
  app.model.outputs.treeColumnSpec
    ? {
        sourceType: 'ptable',
        pTable: app.model.outputs.trees
      }
    : undefined
);
const columns = ref<PTableColumnSpec[]>([]);

const onRowDoubleClickedU = (keys: unknown[]) =>
  onRowDoubleClicked(keys.map((v) => safeConvertToPValue(v)));

const onRowDoubleClicked = (keys: PValue[]) => {
  if (!isPValue(keys[1], 'Long')) throw new Error(`Unexpected key type ${typeof keys[1]}`);
  const donorId = toJsonSafePValue(keys[0]);
  const treeId = Number(keys[1] as bigint);
  const subtreeId = keys.length > 2 ? (keys[2] as bigint).toString() : undefined;
  addDendrogram('Tree / ' + String(keys[0]) + ' / ' + treeId, donorId, treeId, subtreeId, 'X', 'Y');
};

const tableInstance = ref<PlAgDataTableController>();

const treeId = ref<AxisId>({
  type: 'Long',
  name: 'pl7.app/dendrogram/treeId'
});
</script>

<template>
  <PlBlockPage>
    <template #title>Trees Table</template>
    <template #append>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="app.model.ui.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
      <PlBtnGhost @click.stop="() => tableInstance?.exportCsv()">
        Export
        <template #append>
          <PlMaskIcon24 name="export" />
        </template>
      </PlBtnGhost>
    </template>
    <PlAgDataTable
      v-model="app.model.ui.treeTableState"
      :settings="tableSettings"
      :show-cell-button-for-axis-id="treeId"
      show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)"
      @on-row-double-clicked="onRowDoubleClickedU"
      ref="tableInstance"
    />
  </PlBlockPage>
</template>
