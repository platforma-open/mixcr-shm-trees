<script setup lang="ts">
import { ListOption, PlBlockPage, PlBtnGhost, PlBtnPrimary, PlBtnSecondary, PlDialogModal, PlDropdown, PlDropdownLine, PlMaskIcon24, PlSlideModal } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import { computed, reactive, watch } from 'vue';
import { SequenceOfInterest, SOIList, SOIListParameters } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import SOISettingsPanel from './components/SOISettingsPanel.vue';
import SOITable from './components/SOITable.vue';
import SOIImportModal from './components/SOIImportModal.vue';
import { getRawPlatformaInstance, LocalImportFileHandle, PlId, uniquePlId } from '@platforma-sdk/model';
import { inferNewName } from '../util';
import { alphabetOptions, targetFeatureOptions } from '../soi_util';

const app = useApp();

const lists = computed(() =>
  [...(app.model.args.sequencesOfInterest?.map((l) => ({
    value: l.parameters.id,
    label: l.parameters.name
  })) ?? []), {
    value: "", label: "+ Add New List"
  }] as ListOption<string>[])

type NewListSettings = Pick<SOIListParameters, 'type' | 'targetFeature'>

const data = reactive<{
  currentListId?: PlId,
  importFile?: LocalImportFileHandle,
  settingsOpen: boolean,
  newList?: NewListSettings,
  listToDelete?: PlId
}>({ settingsOpen: false })

watch(() => app.model.args.sequencesOfInterest?.map(v => v.parameters.id) ?? [], (ids) => {
  if (data.currentListId === undefined && ids.length > 0)
    data.currentListId = ids[0];
  else if (!ids.find(id => id === data.currentListId)) {
    if (ids.length === 0)
      data.currentListId = undefined;
    else
      data.currentListId = ids[0];
  }
}, { immediate: true })

function startAddingNewList() {
  data.newList = { type: 'nucleotide', targetFeature: 'CDR3' }
}

function addNewList() {
  if (!data.newList)
    return;
  const id = uniquePlId()
  let sois = app.model.args.sequencesOfInterest
  if (sois === undefined) {
    sois = []
    app.model.args.sequencesOfInterest = sois
  }
  let prefix = data.newList.targetFeature + ' ' + (data.newList.type === 'nucleotide' ? 'Nt' : 'AA')
  const name = inferNewName(sois.map(l => l.parameters.name), i => `${prefix} List (${i})`)
  sois.push({
    sequences: [], parameters: {
      id, name,
      type: data.newList.type, targetFeature: data.newList.targetFeature,
      searchParameters: {
        type: 'preset_alignment_search_top',
        dissimilarityPercent: data.newList.type === 'nucleotide' ? 10 : 2
      }
    }
  })
  data.currentListId = id
  data.newList = undefined
  data.settingsOpen = true
}

function getListIdx(id: PlId | undefined): number | undefined {
  if (id === undefined) return undefined;
  const idx = app.model.args.sequencesOfInterest?.findIndex(l => l.parameters.id === id)
  if (idx === undefined || idx === -1)
    return undefined;
  return idx;
}

function deleteList(listToDelete: PlId) {
  const idx = getListIdx(data.currentListId);
  if (idx === undefined) return;
  data.currentListId = idx > 0
    ? app.model.args.sequencesOfInterest![idx - 1].parameters.id
    : app.model.args.sequencesOfInterest!.length === 1
      ? undefined
      : app.model.args.sequencesOfInterest![1].parameters.id;
  app.model.args.sequencesOfInterest!.splice(idx, 1)
}

async function importFile() {
  const file = await getRawPlatformaInstance().lsDriver.showOpenSingleFileDialog({
    title: "Select sequence list file",
    buttonLabel: "Import",
    filters: [
      { name: "Fasta Or Table", extensions: ["xlsx", "tsv", "csv", "fa", "fasta", "txt"] }
    ]
  })
  if (!file.file) return;
  data.importFile = file.file;
}

function onImport(records: SequenceOfInterest[]) {
  const idx = getListIdx(data.currentListId);
  if (idx === undefined) return;
  app.model.args.sequencesOfInterest![idx].sequences = [
    ...app.model.args.sequencesOfInterest![idx].sequences,
    ...records
  ]
  data.importFile = undefined;
}

const currentListIdForList = computed<string>({
  get: () => data.currentListId ?? "",
  set: (newValue) => {
    if (newValue === "")
      startAddingNewList()
    else
      data.currentListId = newValue as PlId
  }
})

const currentList = computed<SOIList | undefined>({
  get: () => {
    if (data.currentListId === undefined)
      return undefined;
    return app.model.args.sequencesOfInterest?.find(l => l.parameters.id === data.currentListId)
  },
  set: (newValue) => {
    if (data.currentListId === undefined || newValue === undefined)
      return;
    const idx = app.model.args.sequencesOfInterest?.findIndex(l => l.parameters.id === data.currentListId)
    if (idx === undefined || idx === -1)
      return
    app.model.args.sequencesOfInterest![idx] = newValue
  }
})

</script>

<template>
  <PlBlockPage>
    <template #title>
      <PlDropdownLine v-if="data.currentListId" :options="lists" v-model="currentListIdForList" />
      <PlBtnGhost v-else @click.stop="() => startAddingNewList()" icon="add">Create new list</PlBtnGhost>
    </template>
    <template #append>
      <template v-if="data.currentListId">
        <PlBtnGhost @click.stop="() => data.listToDelete = data.currentListId" icon="delete-bin">Delete current list
        </PlBtnGhost>
        <PlBtnGhost @click.stop="importFile" icon="dna-import">Import Sequences</PlBtnGhost>
        <PlBtnGhost @click.stop="() => data.settingsOpen = true" icon="settings">Settings</PlBtnGhost>
      </template>
    </template>

    <template v-if="currentList">
      <div :style="{ flex: 1 }">
        <SOITable v-model="currentList.sequences" />
      </div>
    </template>

    <SOIImportModal v-if="data.importFile" :file="data.importFile" @on-close="data.importFile = undefined"
      @on-import="onImport" :alphabet="currentList!.parameters.type"
      :target-feature="currentList!.parameters.targetFeature" />

    <!-- <PlDataDialogModal v-model="data.newList">
      <template #default="{ value }">
        <PlDropdown :options="alphabetOptions" v-model="value.type" label="Alphabet" />
        <PlDropdown :options="targetFeatureOptions" v-model="value.targetFeature" label="Target Feature" />
      </template>
    </PlDataDialogModal> -->

    <PlDialogModal v-if="data.newList !== undefined" :model-value="true"
      @update:model-value="(v) => { if (!v) data.newList = undefined }">
      <template #title>New list settings</template>
      <PlDropdown :options="alphabetOptions" v-model="data.newList.type" label="Alphabet" />
      <PlDropdown :options="targetFeatureOptions" v-model="data.newList.targetFeature" label="Target Feature" />
      <p><b>Note:</b> Nucleotide sequences will be automatically translated if added to the amino acid sequence list.
      </p>
      <template #actions>
        <PlBtnPrimary @click="() => addNewList()">Create</PlBtnPrimary>
        <PlBtnSecondary @click="() => data.newList = undefined">Cancel</PlBtnSecondary>
      </template>
    </PlDialogModal>

    <PlDialogModal v-if="data.listToDelete !== undefined" :model-value="true"
      @update:model-value="(v) => { if (!v) data.listToDelete = undefined }">
      <template #title>Confirm delete</template>
      <template #actions>
        <PlBtnPrimary @click="() => deleteList(data.listToDelete!)">Delete</PlBtnPrimary>
        <PlBtnSecondary @click="() => data.listToDelete = undefined">Cancel</PlBtnSecondary>
      </template>
    </PlDialogModal>

    <PlSlideModal v-model="data.settingsOpen" v-if="currentList !== undefined">
      <template #title>Settings</template>
      <SOISettingsPanel v-model="currentList.parameters" />
    </PlSlideModal>
  </PlBlockPage>
</template>