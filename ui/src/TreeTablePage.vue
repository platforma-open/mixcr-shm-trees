<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed, ref } from 'vue';
import {
  PlBlockPage,
  PlBtnGhost,
  PlMaskIcon24,
  PlSlideModal,
  PlDataTableSettings,
  PlAgDataTable,
  PlTableFilters,
} from '@platforma-sdk/ui-vue';
import { PTableColumnSpec } from '@platforma-sdk/model';

const app = useApp();

// TODO add default option to filter table by donor
const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: "ptable",
  pTable: app.model.outputs.trees
}));
const columns = ref<PTableColumnSpec[]>([]);
</script>

<template>
  <PlBlockPage>
    <template #title>Trees Table</template>
    <template #append>
      <PlBtnGhost @click.stop="() => app.model.ui.filtersOpen = true">
        Filters
        <template #append>
          <PlMaskIcon24 :name="columns.length > 0 && (app.model.ui.filterModel.filters ?? []).length > 0 ? 'filter-on' : 'filter'"/>
        </template>
      </PlBtnGhost>
    </template>
    <PlAgDataTable v-model="app.model.ui.treeTableState" :settings="tableSettings" @columns-changed="(newColumns) => columns = newColumns" />
  </PlBlockPage>
  <PlSlideModal v-model="app.model.ui.filtersOpen" :shadow="true" :close-on-outside-click="true">
    <template #title>Filters</template>
    <PlTableFilters v-model="app.model.ui.filterModel" :columns="columns" />
  </PlSlideModal>
</template>
