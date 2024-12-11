<script setup lang="ts">
import { ListOption, PlBlockPage, PlBtnGhost, PlDialogModal, PlDropdownLine, PlMaskIcon24, PlSlideModal } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import { computed, reactive, watch } from 'vue';
import { PlId, SequenceOfInterest, SOIList, uniquePlId } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import SOISettingsPanel from './components/SOISettingsPanel.vue';
import SOITable from './components/SOITable.vue';
import SOIImportModal from './components/SOIImportModal.vue';
import { getRawPlatformaInstance, LocalImportFileHandle } from '@platforma-sdk/model';

const app = useApp();

const lists = computed(() =>
  [...(app.model.args.sequencesOfInterest?.map((l) => ({
    value: l.parameters.id,
    label: l.parameters.name
  })) ?? []), {
    value: "", label: "+ Add New List"
  }] as ListOption<string>[])

const data = reactive<{ currentListId?: PlId, importFile?: LocalImportFileHandle, settingsOpen: boolean }>({ settingsOpen: false })

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

function addNewList() {
  const id = uniquePlId()
  let sois = app.model.args.sequencesOfInterest
  if (sois === undefined) {
    sois = []
    app.model.args.sequencesOfInterest = sois
  }
  const names = new Set(sois.map(l => l.parameters.name));
  let i = 1;
  let name = '';
  do {
    name = `Sequence List (${i})`;
    i++;
  } while (names.has(name))
  sois.push({
    sequences: [], parameters: {
      id, name,
      targetFeature: 'CDR3', type: 'nucleotide',
      searchParameters: { type: 'tree_search_top', parameters: 'oneMismatch' }
    }
  })
  data.currentListId = id
  data.settingsOpen = true
}

function getCurrentListIdx(): number | undefined {
  if (data.currentListId === undefined) return undefined;
  const idx = app.model.args.sequencesOfInterest?.findIndex(l => l.parameters.id === data.currentListId)
  if (idx === undefined || idx === -1)
    return undefined;
  return idx;
}

function deleteCurrentList() {
  const idx = getCurrentListIdx();
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
      { name: "Fasta Or Table", extensions: ["xlsx", "tsv", "csv", "fa", "fasta"] }
    ]
  })
  if (!file.file) return;
  data.importFile = file.file;
}

function onImport(records: SequenceOfInterest[]) {
  const idx = getCurrentListIdx();
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
      addNewList()
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
      <PlBtnGhost v-else @click.stop="() => addNewList()">Create new list
        <template #append>
          <PlMaskIcon24 name="add" />
        </template>
      </PlBtnGhost>
    </template>
    <template #append>
      <template v-if="data.currentListId">
        <PlBtnGhost @click.stop="deleteCurrentList">Delete current list
          <template #append>
            <PlMaskIcon24 name="delete-bin" />
          </template>
        </PlBtnGhost>
        <PlBtnGhost @click.stop="importFile">Import Sequences
          <template #append>
            <PlMaskIcon24 name="dna-import" />
          </template>
        </PlBtnGhost>
        <PlBtnGhost @click.stop="() => data.settingsOpen = true">Settings
          <template #append>
            <PlMaskIcon24 name="settings" />
          </template>
        </PlBtnGhost>
      </template>
    </template>

    <template v-if="currentList">
      <div :style="{ flex: 1 }">
        <SOITable v-model="currentList.sequences" />
      </div>
    </template>

    <SOIImportModal v-if="data.importFile" :file="data.importFile" @on-close="data.importFile = undefined"
      @on-import="onImport" />

    <PlSlideModal v-model="data.settingsOpen" v-if="currentList !== undefined">
      <template #title>Settings</template>
      <SOISettingsPanel v-model="currentList.parameters" />
    </PlSlideModal>
  </PlBlockPage>
</template>