<script setup lang="ts">
import { SequenceOfInterest, uniquePlId } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { getFileNameFromHandle, getRawPlatformaInstance, LocalImportFileHandle } from '@platforma-sdk/model';
import { PlDialogModal, PlBtnPrimary, PlBtnGhost, ListOption, PlDropdown, PlLogView } from '@platforma-sdk/ui-vue';
import { computedAsync } from '@vueuse/core';
import { computed, reactive } from 'vue';
import * as XLSX from 'xlsx';
import { readFileForImport } from '../../dataimport';

// const model = defineModel<ImportFileHandle>({ required: true })
const props = defineProps<{ file: LocalImportFileHandle }>()

type ErrorMessage = { title: string, message?: string }
const data = reactive<{ errorMessage?: ErrorMessage, importing: boolean, sequenceColumn?: number, nameColumn?: number }>({ importing: false });

const emit = defineEmits<{
  onClose: []
  onImport: [data: SequenceOfInterest[]]
}>()

const fileName = computed(() => getFileNameFromHandle(props.file));

const fileType = computed<'table' | 'fasta'>(() => {
  if (fileName.value.endsWith('.tsv') || fileName.value.endsWith('.csv')
    || fileName.value.endsWith('.xlsx') || fileName.value.endsWith('.xls')
    || fileName.value.endsWith('.txt'))
    return 'table'
  else
    return 'fasta'
});

const tableData = computedAsync(async () => {
  const pl = getRawPlatformaInstance();
  if (fileType.value === 'table') {
    if ((await pl.lsDriver.getLocalFileSize(props.file)) > 5_000_000) {
      data.errorMessage = { title: 'File is too big' };
      return undefined;
    }
    const content = await platforma!.lsDriver.getLocalFileContent(props.file);
    try {
      return readFileForImport(content);
    } catch (e: any) {
      console.error(e);
      data.errorMessage = { title: 'Error reading table', message: e.msg };
      return undefined;
    }
  }
  return undefined
})

const columnOptions = computed<ListOption<number>[]>(() => {
  if (tableData.value) {
    const rawData = tableData.value
    return rawData.data.columns.map((c, idx) => ({
      value: idx,
      label: c.header
    }))
  } else return [] as ListOption<number>[];
})

const importText = computed(() => {
  if (fileType.value === 'table') {
    if (tableData.value)
      return `Number of rows to be imported: ${tableData.value.data.rows.length}`
    else
      return `Error reading table.\n${data.errorMessage?.title}`
  } else
    return `Fasta files are not yet supported`
})

const canImport = computed(() =>
  fileType.value === 'table'
    ? data.nameColumn !== undefined && data.sequenceColumn !== undefined
    : false
)

async function runImport() {
  data.importing = true;
  let result: SequenceOfInterest[] = []
  if (tableData.value) {
    const rawData = tableData.value
    const nc = data.nameColumn!
    const sc = data.sequenceColumn!
    result = rawData.data.rows
      .filter(r => r[nc] !== undefined && r[sc] !== undefined)
      .map(r => ({ id: uniquePlId(), name: String(r[nc]!), sequence: String(r[sc]!) }))
  }
  emit("onImport", result);
}
</script>

<template>
  <PlDialogModal :model-value="true" @update:model-value="(v) => { if (!v) emit('onClose') }">
    <template #title>Import sequences</template>
    <template v-if="fileType === 'table'">
      <PlDropdown :options="columnOptions" v-model="data.sequenceColumn" clearable label="Sequence Column" />
      <PlDropdown :options="columnOptions" v-model="data.nameColumn" clearable label="Name Column" />
      <PlLogView :value="importText" label="Import information" />
    </template>
    <template #actions>
      <PlBtnPrimary @click="runImport" :loading="data.importing" :diabled="!canImport">
        Import
      </PlBtnPrimary>
      <PlBtnGhost @click="emit('onClose')">Cancel</PlBtnGhost>
    </template>
  </PlDialogModal>
</template>
