<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed } from 'vue';
import { PlAgDataTable, PlBlockPage, PlDataTableSettings } from '@platforma-sdk/ui-vue';

const app = useApp();

// TODO add default option to filter table by donor
const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: "ptable",
  pTable: app.model.outputs.trees
}));

</script>

<template>
  <PlBlockPage>
    <PlAgDataTable v-model="app.model.ui.treeTableState" :settings="tableSettings"></PlAgDataTable>
  </PlBlockPage>
</template>
