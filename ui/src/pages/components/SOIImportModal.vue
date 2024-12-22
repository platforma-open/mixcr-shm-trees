<script setup lang="ts">
import { SequenceOfInterest } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { getFileNameFromHandle, getRawPlatformaInstance, LocalImportFileHandle, uniquePlId } from '@platforma-sdk/model';
import { PlDialogModal, PlBtnPrimary, PlBtnGhost, ListOption, PlDropdown, PlLogView } from '@platforma-sdk/ui-vue';
import { computedAsync } from '@vueuse/core';
import { computed, reactive } from 'vue';
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

//
// Commmon
//

const fileContent = computedAsync(async () => {
  const pl = getRawPlatformaInstance();
  if ((await pl.lsDriver.getLocalFileSize(props.file)) > 5_000_000) {
    data.errorMessage = { title: 'File is too big' };
    return undefined;
  }
  try {
    return await platforma!.lsDriver.getLocalFileContent(props.file);
  } catch (e: any) {
    console.error(e);
    data.errorMessage = { title: 'Error reading file', message: e.msg };
    return undefined;
  }
})

//
// Table
//

const tableData = computed(() => {
  if (fileType.value === 'table' && fileContent.value !== undefined) {
    try {
      return readFileForImport(fileContent.value);
    } catch (e: any) {
      console.error(e);
      data.errorMessage = { title: 'Error reading table', message: e.msg };
      return undefined;
    }
  } else
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

//
// Fasta
//

type FastaRecord = { readonly description: string; readonly sequence: string }
function parseFasta(content: string): FastaRecord[] {
  const lines = content.split('\n');
  const records: FastaRecord[] = [];

  let currentDescription = '';
  let currentSequence = '';

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('>')) {
      if (currentDescription || currentSequence)
        records.push({ description: currentDescription, sequence: currentSequence });
      currentDescription = line.replace(/^>\s*/, '');
      currentSequence = '';
    } else if (line.length > 0) {
      currentSequence += line;
    }
  }

  if (currentDescription || currentSequence) {
    records.push({ description: currentDescription, sequence: currentSequence });
  }

  return records;
}

const fastaData = computed(() => {
  if (fileType.value === 'fasta' && fileContent.value !== undefined) {
    try {
      const content = new TextDecoder().decode(fileContent.value);
      return parseFasta(content);
    } catch (e: any) {
      console.error(e);
      data.errorMessage = { title: 'Error reading fasta file', message: e.msg };
      return undefined;
    }
  } else
    return undefined
})

//
// UI
//

const importText = computed(() => {
  if (fileType.value === 'table') {
    if (tableData.value)
      return `Number of rows to be imported: ${tableData.value.data.rows.length}`
    else
      return `Error reading table.\n${data.errorMessage?.title}`
  } else {
    if (fastaData.value)
      return `Number of records to be imported: ${fastaData.value.length}`
    else
      return `Error reading fasta file.\n${data.errorMessage?.title}`
  }
})

const canImport = computed(() =>
  fileType.value === 'table'
    ? data.nameColumn !== undefined && data.sequenceColumn !== undefined
    : (fastaData.value && fastaData.value?.length > 0)
)

function runImport() {
  data.importing = true;
  let result: SequenceOfInterest[] = []
  if (tableData.value) {
    const rawData = tableData.value
    const nc = data.nameColumn!
    const sc = data.sequenceColumn!
    result = rawData.data.rows
      .filter(r => r[nc] !== undefined && r[sc] !== undefined)
      .map(r => ({ id: uniquePlId(), name: String(r[nc]!), sequence: String(r[sc]!) }))
  } else if (fastaData.value && fastaData.value.length > 0) {
    result = fastaData.value
      .filter(r => r.description.length > 0 && r.sequence.length > 0)
      .map(r => ({ id: uniquePlId(), name: r.description, sequence: r.sequence }))
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
    </template>
    <PlLogView :value="importText" label="Import information" />
    <template #actions>
      <PlBtnPrimary @click="runImport" :loading="data.importing" :disabled="!canImport">
        Import
      </PlBtnPrimary>
      <PlBtnGhost @click="emit('onClose')">Cancel</PlBtnGhost>
    </template>
  </PlDialogModal>
</template>
