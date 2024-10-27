<script setup lang="ts" generic="T">
import { PlBtnGroup, PlContainer } from '@platforma-sdk/ui-vue';
import { reactive } from 'vue';
import { ByStepIdRecord, StepId, StepIdSimpleOptions } from './types';

const props = defineProps<{
  content: ByStepIdRecord<T>
}>()

const data = reactive<{
  selectedStep: StepId
}>({
  selectedStep: 'alleles'
})
</script>

<template>
  <PlContainer>
    <PlBtnGroup :options="StepIdSimpleOptions" v-model="data.selectedStep" />
    <slot :value="props.content[data.selectedStep]" :step="data.selectedStep"></slot>
  </PlContainer>
</template>
