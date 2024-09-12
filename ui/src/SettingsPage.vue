<script setup lang="ts">
import { useApp } from './app';
import { computed } from 'vue';
import { PlDropdown } from '@milaboratory/platforma-uikit';

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
  <div class="container">
    <pl-dropdown :options="donorColumnOptions ?? []" v-model="args.model.donorColumn" label="Select donor column" clearable />
    <!-- TODO show only when donor column is seleceted -->
    <!-- TODO reset when donor column is changed -->
    <!-- TODO show button to add another one if selected -->
    <!-- TODO remove button -->
    <pl-dropdown :options="datasetColumnOptions ?? []" v-model="args.model.datasetColumns[0]" label="Select dataset" />
  </div>
</template>

<style lang="css">
button {
  padding: 12px 0;
}

.container {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  gap: 24px;
}
</style>
