<script setup lang="ts">
import Log from './Log.vue';
import { TreeResult } from './results';
import PerStepWrapper from './PerStepWrapper.vue';

const props = defineProps<{
  donerResult: TreeResult
}>()
</script>

<template>
  <PerStepWrapper :content="donerResult.logHandle" v-slot="{ value }">
    <Log :handle="value" />
  </PerStepWrapper>
</template>
