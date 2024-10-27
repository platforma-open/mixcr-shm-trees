<script setup lang="ts">
import { TreeResult } from './results';
import PerStepWrapper from './PerStepWrapper.vue';
import { PlTextArea, ReactiveFileContent } from '@platforma-sdk/ui-vue';

const props = defineProps<{
  donerResult: TreeResult
}>()
</script>

<template>
  <PerStepWrapper :content="donerResult.txtReportHandle" v-slot="{ value }">
    <PlTextArea :model-value="ReactiveFileContent.getContentString(value?.handle)?.value" :rows="30" readonly />
  </PerStepWrapper>
</template>
