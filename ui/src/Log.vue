<script setup lang="ts">
import { PlLogView } from '@platforma-sdk/ui-vue';
import { shallowRef, watch } from 'vue';
import { useTimeoutPoll, whenever } from '@vueuse/core';
import { AnyLogHandle, getRawPlatformaInstance } from '@platforma-sdk/model';
import { ProgressPrefix } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const props = defineProps<{ handle: AnyLogHandle | undefined }>()

type LogState = {
  logHandle: AnyLogHandle,
  lines: string,
  lastOffset: number,
  finished: boolean
}

const logState = shallowRef<LogState>()

// from here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchLogs() {
  // making a snapshot of the ref
  let currentLogState: LogState | undefined = logState.value;
  if (currentLogState === undefined)
    return;

  while (true) {
    // the only async operation
    const result = await getRawPlatformaInstance().logDriver.readText(currentLogState.logHandle, 100, currentLogState.lastOffset)

    if (result.shouldUpdateHandle)
      return;

    if (currentLogState.logHandle !== logState.value?.logHandle)
      // somebody changed target log while we were fetching log data
      return;

    const newLines = (new TextDecoder().decode(result.data)).replace(new RegExp(`${escapeRegExp(ProgressPrefix)}`, 'g'), '')
    currentLogState = { ...currentLogState, lines: currentLogState.lines + newLines, lastOffset: result.newOffset, finished: !result.live }
    if (result.newOffset >= result.size)
      break
  }

  // see loop above, it guaraneees that currentLogState.logHandle !== logState.value?.logHandle
  // setting value does trigger change according to shellowRef docs
  logState.value = currentLogState;
}

// Only trigger after last fetch is done
const { pause: pauseFetchingLogs, resume: resumeFetchingLogs } = useTimeoutPoll(fetchLogs, 1500, { immediate: false })

whenever(() => logState?.value?.finished, () => pauseFetchingLogs())

watch(() => props.handle, (lh) => {
  if (lh === undefined) {
    logState.value = undefined;
    pauseFetchingLogs()
    return;
  }

  if (lh !== logState.value?.logHandle) {
    logState.value = { logHandle: lh, lastOffset: 0, lines: "", finished: false };
    resumeFetchingLogs();
  }
}, { immediate: true })
</script>

<template>
  <PlLogView :value="logState?.lines" />
</template>
