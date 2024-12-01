<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { PTableColumnSpec } from '@platforma-sdk/model';
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
const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: 'ptable',
  pTable: app.model.outputs.trees
}));
const columns = ref<PTableColumnSpec[]>([]);

const onRowDoubleClicked = (keys: any[]) => {
  const donorId = keys[0];
  const treeId = Number(keys[1] as bigint);
  const subtreeId = keys.length > 2 ? (keys[2] as bigint).toString() : undefined;
  addDendrogram('Tree / ' + donorId + " / " + treeId, donorId, treeId,subtreeId,  "X", "Y");
}

const tableInstance = ref<PlAgDataTableController>();
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
    <PlAgDataTable v-model="app.model.ui.treeTableState" :settings="tableSettings" show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" 
      @on-row-double-clicked="onRowDoubleClicked"
      ref="tableInstance" />
  </PlBlockPage>
</template>
