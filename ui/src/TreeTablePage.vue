<script setup lang="ts">
// import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed } from 'vue';
import { PlAgDataTable, PlBlockPage, PlDataTableSettings } from '@platforma-sdk/ui-vue';

const app = useApp();

const uiState = app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {}
}))

const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: "ptable",

  pTable: app.outputs.trees,

  // sheets: [
  //   {
  //     id: "trees",
  //     axis: {
  //       type: "String",
  //       name: "pl7.app/sampleId",
  //     },
  //     options: [],
  //     // defaultValue: ",
  //   }
  // ],
}));

</script>

<template>
  <PlBlockPage>
    <PlAgDataTable v-model="uiState.model.treeTableState" :settings="tableSettings"></PlAgDataTable>
  </PlBlockPage>
</template>
