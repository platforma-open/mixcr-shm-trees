<script setup lang="ts">
import { useApp } from './app';
import { computed } from 'vue';
import { PlBlockPage, PlDropdown } from '@milaboratories/uikit';

const app = useApp();
const args = app.createArgsModel();

const donorColumnOptions = computed(() =>
  app.getOutputFieldOkOptional("donorColumnOptions")?.map((v) => ({
    text: v.label,
    value: v.ref,
  }))
);
const datasetColumnOptions = computed(() =>
  app.getOutputFieldOkOptional("datasetColumnOptions")?.map((v) => ({
    text: v.label,
    value: v.ref,
  }))
);

</script>

<template>
  <PlBlockPage>
    <template #title>Settings</template>
    <PlDropdown :options="donorColumnOptions ?? []" v-model="args.model.donorColumn" label="Select donor column" clearable />
    <!-- TODO show only when donor column is seleceted -->
    <!-- TODO reset when donor column is changed -->
    <!-- TODO show button to add another one if selected -->
    <!-- TODO remove button -->
    <PlDropdown :options="datasetColumnOptions ?? []" v-model="args.model.datasetColumns[0]" label="Select dataset" />
  </PlBlockPage>
</template>