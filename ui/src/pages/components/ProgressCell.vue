<script setup lang="ts">
import { ICellRendererParams } from 'ag-grid-enterprise';
import { ProgressPattern } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { computed, unref } from 'vue';
import { TreeResult } from '../../results';
import type { PlProgressCellProps } from '@platforma-sdk/ui-vue';
import { PlAgCellProgress } from '@platforma-sdk/ui-vue';

const props = defineProps<{
  params: ICellRendererParams<TreeResult, string>;
}>();

const progressString = computed(() => {
  return props.params.value ?? 'Unknown';
});

type Parsed = {
  raw?: string;
  stage?: string;
  percentage?: string;
  eta?: string;
  etaLabel?: string;
  percentageLabel?: string;
};

const parsed = computed<Parsed>(() => {
  const raw = unref(progressString);

  const res: Parsed = {
    raw
  };

  if (!raw) {
    return res;
  }

  const match = raw.match(ProgressPattern);

  if (match) {
    const { stage, progress, eta } = match?.groups!;
    res.stage = stage;
    res.percentage = progress;
    res.eta = eta;
  } else {
    res.stage = raw;
  }

  if (res.stage === 'Done') {
    res.percentage = '100';
  }

  if (res.percentage) {
    res.percentageLabel = res.percentage + '%';
  }

  if (res.eta) {
    res.etaLabel = `ETA: ${res.eta}`;
  }

  return res;
});

const ProgressProps = computed<PlProgressCellProps>(() => {
  return {
    stage: parsed.value.raw === 'Queued' ? 'not_started' : 'running',
    step: parsed.value.stage || '',
    progress: parsed.value.percentage ? +parsed.value.percentage : undefined,
    progressString: parsed.value.etaLabel || ''
  };
});
</script>

<template>
  <PlAgCellProgress v-bind="{ params: { ...props.params, ...ProgressProps } }" />
</template>
