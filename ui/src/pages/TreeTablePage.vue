<script setup lang="ts">
import {
  AxisId,
  isPValue,
  PTableColumnSpec,
} from '@platforma-sdk/model';
import {
  PlAgDataTable,
  PlAgDataTableToolsPanel,
  PlBlockPage,
  PlTableFilters,
  PTableRowKey,
  type PlAgDataTableController,
  type PlDataTableSettings
} from '@platforma-sdk/ui-vue';
import { computed, ref, watch } from 'vue';
import { addDendrogram } from '../addDendrogram';
import { useApp } from '../app';
import { deepEqual } from '@milaboratories/helpers';

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

function noNaOrNULL(key: PTableRowKey): key is (string | number)[] {
  for (const k of key) {
    const kType = typeof k;
    if (kType !== 'number' && kType !== 'string')
      return false;
  }
  return true;
}

const onRowDoubleClicked = (keys?: PTableRowKey) => {
  console.dir(keys)
  if (!keys || !noNaOrNULL(keys)) return;
  if (!isPValue(keys[1], 'Long')) throw new Error(`Unexpected key type ${typeof keys[1]}`)
  const donorId = keys[0];
  const treeId = Number(keys[1]);
  const subtreeId = keys.length > 2 ? String(keys[2]) : undefined;
  addDendrogram('Tree / ' + String(keys[0]) + ' / ' + treeId, donorId, treeId, subtreeId, 'X', 'Y');
};

const tableInstance = ref<PlAgDataTableController>();

const treeIdAxis = ref<AxisId>({
  type: 'Long',
  name: 'pl7.app/dendrogram/treeId'
});

// @TODO Temp fix (to remove)
const treeTableState = computed({
  get() {
    return app.model.ui.treeTableState;
  },
  set(n) {
    if (!n.gridState.sort) {
      delete n.gridState.sort;
    }

    if (!deepEqual(n, app.model.ui.treeTableState)) {
      app.model.ui.treeTableState = n;
    }
  }
});
</script>

<template>
  <PlBlockPage>
    <template #title>Trees Table</template>
    <template #append>
      <PlAgDataTableToolsPanel>
        <PlTableFilters v-model="app.model.ui.filterModel" :columns="columns" />
      </PlAgDataTableToolsPanel>
    </template>
    <PlAgDataTable v-model="app.model.ui.treeTableState" :settings="tableSettings" :show-cell-button-for-axis-id="treeIdAxis"
      @cell-button-clicked="onRowDoubleClicked" show-export-button show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" ref="tableInstance" />
  </PlBlockPage>
</template>
