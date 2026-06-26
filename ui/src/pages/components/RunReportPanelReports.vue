<script setup lang="ts">
import { PlTextArea, ReactiveFileContent } from "@platforma-sdk/ui-vue";
import { TreeResult } from "../../results";
import PerStepWrapper from "./PerStepWrapper.vue";

defineProps<{ donorResult: TreeResult }>();

const fileContent = ReactiveFileContent.useGlobal();
</script>

<template>
  <PerStepWrapper :content="donorResult.txtReportHandle" v-slot="{ value }">
    <PlTextArea
      :model-value="fileContent.getContentString(value?.handle)?.value"
      :rows="30"
      readonly
    />
  </PerStepWrapper>
</template>
