<script setup lang="ts">
import { ICellRendererParams } from '@ag-grid-community/core';
import { ProgressPattern } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { computed, unref } from 'vue';
import { TreeResult } from './results';

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

const canShowBackground = computed(
  () => parsed.value.stage !== 'Queued' && (parsed.value.etaLabel ?? parsed.value.percentageLabel)
);
</script>

<template>
  <div :class="{ 'progress-cell__white-bg': canShowBackground }" class="progress-cell">
    <div class="progress-cell__indicator" :style="{ width: parsed.percentage + '%' }"></div>
    <div class="progress-cell__body">
      <div
        :class="{ 'progress-cell__stage--queued': parsed.stage === 'Queued' }"
        class="progress-cell__stage"
      >
        {{ parsed.stage }}
      </div>
      <div class="progress-cell__percentage">{{ parsed.etaLabel ?? parsed.percentageLabel }}</div>
    </div>
  </div>
</template>

<style lang="css">
.progress-cell {
  height: 100%;
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 2px;
}
.progress-cell__white-bg {
  background-color: #fff;
}

.progress-cell__indicator {
  position: absolute;
  height: 100%;
  transition: width 0.4s ease-in-out;
  background: linear-gradient(90deg, #fff 0%, #d8fac8 100%);
}

.progress-cell__body {
  padding: 0 15px;
  display: flex;
  gap: 12px;
  align-items: center;
  height: 100%;
  width: 100%;
  position: absolute;
  z-index: 1;
}

.progress-cell__stage {
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.progress-cell__percentage {
  flex-grow: 1;
  flex-shrink: 0;
  text-align: right;
}

.progress-cell__stage--queued {
  color: var(--txt-03);
}
</style>
