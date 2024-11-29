<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { PTableColumnSpec } from '@platforma-sdk/model';
import {
  PlAgDataTable,
  PlAgDataTableToolsPanel,
  PlBlockPage,
  PlBtnGhost,
  PlMaskIcon24,
  PlSlideModal,
  PlTableFilters,
  type PlAgDataTableController,
  type PlDataTableSettings
} from '@platforma-sdk/ui-vue';
import { computed, ref } from 'vue';
import { addDendrogram } from '../addDendrogram';
import { useApp } from '../app';

const app = useApp();

(() => {
  if (app.model.ui.filtersOpen === undefined) app.model.ui.filtersOpen = false;
  if (app.model.ui.filterModel === undefined) app.model.ui.filterModel = {};
})();

// TODO add default option to filter table by donor
const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: 'ptable',
  pTable: app.model.outputs.trees
}));
const columns = ref<PTableColumnSpec[]>([]);

const hasFilters = computed(
  () => columns.value.length > 0 && (app.model.ui.filterModel.filters ?? []).length > 0
);
const filterIconName = computed(() => (hasFilters.value ? 'filter-on' : 'filter'));
const filterIconColor = computed(() =>
  hasFilters.value ? { backgroundColor: 'var(--border-color-focus)' } : undefined
);

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
      <PlAgDataTableToolsPanel />
      <PlBtnGhost @click.stop="() => tableInstance?.exportCsv()">
        Export
        <template #append>
          <PlMaskIcon24 name="export" />
        </template>
      </PlBtnGhost>
      <PlBtnGhost @click.stop="() => (app.model.ui.filtersOpen = true)">
        Filters
        <template #append>
          <PlMaskIcon24 :name="filterIconName" :style="filterIconColor" />
        </template>
      </PlBtnGhost>
    </template>
    <PlAgDataTable v-model="app.model.ui.treeTableState" :settings="tableSettings" show-columns-panel
      @columns-changed="(newColumns) => (columns = newColumns)" @onRowDoubleClicked="onRowDoubleClicked"
      ref="tableInstance" />
  </PlBlockPage>
  <PlSlideModal v-model="app.model.ui.filtersOpen" :shadow="true" :close-on-outside-click="true">
    <template #title>Filters</template>
    <PlTableFilters v-model="app.model.ui.filterModel" :columns="columns" />
  </PlSlideModal>
</template>
