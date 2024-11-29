<script setup lang="ts">
import { PlLogView } from '@platforma-sdk/ui-vue';
import { TreeResult } from '../../results';
import PerStepWrapper from './PerStepWrapper.vue';

defineProps<{ donorResult: TreeResult }>()
</script>

<template>
  <PerStepWrapper :content="donorResult.logHandle" v-slot="{ value }">
    <PlLogView :log-handle="value" />
  </PerStepWrapper>
</template>
