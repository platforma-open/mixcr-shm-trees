<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed, ref, watch } from 'vue';
import {
  PlBlockPage,
  PlBtnGhost,
  PlMaskIcon24,
  PlSlideModal,
  PlDataTableSettings,
  PlAgDataTable,
  PlTableFilters
} from '@platforma-sdk/ui-vue';
import { PTableColumnSpec } from '@platforma-sdk/model';

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
</script>

<template>
  <PlBlockPage>
    <template #title>Trees Table</template>
    <template #append>
      <PlBtnGhost @click.stop="() => (app.model.ui.filtersOpen = true)">
        Filters
        <template #append>
          <PlMaskIcon24 :name="filterIconName" :style="filterIconColor" />
        </template>
      </PlBtnGhost>
    </template>
    <PlAgDataTable
      v-model="app.model.ui.treeTableState"
      :settings="tableSettings"
      @columns-changed="(newColumns) => (columns = newColumns)"
    />
  </PlBlockPage>
  <PlSlideModal v-model="app.model.ui.filtersOpen" :shadow="true" :close-on-outside-click="true">
    <template #title>Filters</template>
    <PlTableFilters v-model="app.model.ui.filterModel" :columns="columns" />
  </PlSlideModal>
</template>
