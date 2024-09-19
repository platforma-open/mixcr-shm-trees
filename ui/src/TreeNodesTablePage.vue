<script setup lang="ts">
import { platforma } from '@milaboratory/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed } from 'vue';
import { PlAgDataTable, PlDataTableSettings } from '@milaboratory/sdk-vue';

const app = useApp();

const uiState = app.createUiModel({}, () => ({}))

const tableSettings = computed<PlDataTableSettings>(() => ({
  sourceType: "pframe",

  pTable: app.outputs.treeNodes,

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
  <div class="container">
    <PlAgDataTable v-model="uiState.model.treeNodesTableState" :settings="tableSettings"></PlAgDataTable>
  </div>
</template>
