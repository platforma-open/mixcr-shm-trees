<script setup lang="ts">
import { Alphabet, SequenceOfInterest, TargetFeature } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { getFileNameFromHandle, getRawPlatformaInstance, LocalImportFileHandle, uniquePlId } from '@platforma-sdk/model';
import { PlDialogModal, PlBtnPrimary, PlBtnGhost, ListOption, PlDropdown, PlLogView } from '@platforma-sdk/ui-vue';
import { computedAsync } from '@vueuse/core';
import { computed, reactive } from 'vue';
import { readFileForImport } from '../../dataimport';
import { detectAlphabet, translate } from '../../alphabets';

// const model = defineModel<ImportFileHandle>({ required: true })
const props = defineProps<{ file: LocalImportFileHandle, alphabet: Alphabet, targetFeature: TargetFeature }>()

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

const sequencesToImport = computed(() => {
  if (fileType.value === 'table') {
    const sc = data.sequenceColumn;
    if (!tableData.value || sc === undefined)
      return undefined;
    return tableData.value.data.rows
      .filter(r => r[sc] !== undefined)
      .map(r => String(r[sc]))
  } else {
    if (fastaData.value === undefined)
      return undefined;
    return fastaData.value.map(r => r.sequence)
  }
})

const recordsToImport = computed(() => {
  if (fileType.value === 'table') {
    const sc = data.sequenceColumn;
    const nc = data.nameColumn;
    if (!tableData.value || sc === undefined || nc === undefined)
      return undefined;
    return tableData.value.data.rows
      .filter(r => r[nc] !== undefined && r[sc] !== undefined)
      .map(r => ({
        description: String(r[nc]),
        sequence: String(r[sc])
      } satisfies FastaRecord))
  } else {
    if (fastaData.value === undefined)
      return undefined;
    return fastaData.value
  }
})

const detectedAlphabetHelper = computed(() => {
  if (sequencesToImport.value === undefined || sequencesToImport.value.length === 0)
    return undefined;
  try {
    return detectAlphabet(sequencesToImport.value);
  } catch (e: unknown) {
    console.log(e);
    return undefined;
  }
})

//
// UI
//

type TextAndRecords = {
  text: string,
  records?: FastaRecord[]
}

const importData = computed<TextAndRecords>(() => {
  if (data.errorMessage)
    return { text: `Error:\n${data.errorMessage?.title}` };
  const soi = sequencesToImport.value;
  if (soi === undefined)
    return { text: `Please select sequences` };
  const da = detectedAlphabetHelper.value;
  if (!da)
    return { text: `Can't detect alphabet` };

  if (da.type === 'amino-acid' && props.alphabet === 'nucleotide')
    return { text: `Can't convert amino acid sequence to nucleotides, please create nucleotide sequence list.` };

  let records = recordsToImport.value;
  if (records === undefined)
    return { text: `Please select sequence name column.` };

  let text = ''
  if (da.type === 'nucleotide' && props.alphabet === 'amino-acid') {
    try {
      records = records.map(({ description, sequence }) => ({ description, sequence: translate(sequence) }))
    } catch (e: any) {
      return { text: `Can't translate sequences: ${e.message}` }
    }
    text = 'Sequences are translated to fit the sequence list alphabet.\n'
  }
  text += `Records to import: ${records.length}`

  return { text, records };
})

const canImport = computed(() =>
  importData.value?.records?.length && importData.value?.records?.length > 0
)

function runImport() {
  data.importing = true;
  let result: SequenceOfInterest[] = []
  const records = importData.value?.records;
  if (!records)
    return;
  emit("onImport",
    records.map(r => ({ id: uniquePlId(), name: r.description, sequence: r.sequence })));
}
</script>

<template>
  <PlDialogModal width="800px" :model-value="true" @update:model-value="(v) => { if (!v) emit('onClose') }">
    <template #title>Import sequences</template>
    <template v-if="fileType === 'table'">
      <PlDropdown :options="columnOptions" v-model="data.nameColumn" clearable label="Name Column" />
      <PlDropdown :options="columnOptions" v-model="data.sequenceColumn" clearable label="Sequence Column" />
    </template>
    <PlLogView :value="importData?.text" label="Import information" />
    <template #actions>
      <PlBtnPrimary @click="runImport" :loading="data.importing" :disabled="!canImport">
        Import
      </PlBtnPrimary>
      <PlBtnGhost @click="emit('onClose')">Cancel</PlBtnGhost>
    </template>
  </PlDialogModal>
</template>
