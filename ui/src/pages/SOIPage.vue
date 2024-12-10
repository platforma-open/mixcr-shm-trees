<script setup lang="ts">
import { AgGridVue } from '@ag-grid-community/vue3';
import { AgGridTheme, ListOption, PlAgOverlayLoading, PlAgOverlayNoRows, PlBlockPage, PlBtnGhost, PlDropdownLine, PlMaskIcon24, PlSlideModal } from '@platforma-sdk/ui-vue';
import { useApp } from '../app';
import RunReportPanel from './components/RunReportPanel.vue';
import SettingsPanel from './components/MainSettingsPanel.vue';
import { computed, reactive, watch } from 'vue';
import { PlId, SOIList, uniquePlId } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import SOISettingsPanel from './components/SOISettingsPanel.vue';
import { Args } from '@platforma-sdk/model';

const { model } = useApp();

const lists = computed(() =>
  [...(model.args.sequencesOfInterest?.map((l) => ({
    value: l.parameters.id,
    label: l.parameters.name
  })) ?? []), {
    value: "", label: "+ Add New List"
  }] as ListOption<string>[])

const data = reactive<{ currentListId: PlId | undefined, settingsOpen: boolean }>({ currentListId: model.args.sequencesOfInterest?.[0]?.parameters?.id, settingsOpen: false })

function addNewList() {
  const id = uniquePlId()
  let sois = model.args.sequencesOfInterest
  if (sois === undefined) {
    sois = []
    model.args.sequencesOfInterest = sois
  }
  sois.push({
    sequences: [], parameters: {
      id, name: "Sequence List", targetFeature: 'CDR3',
      type: 'nucleotide',
      searchParameters: { type: 'tree_search_top', parameters: 'oneMismatch' }
    }
  })
  data.currentListId = id
  data.settingsOpen = true
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
    return model.args.sequencesOfInterest?.find(l => l.parameters.id === data.currentListId)
  },
  set: (newValue) => {
    if (data.currentListId === undefined || newValue === undefined)
      return;
    const idx = model.args.sequencesOfInterest?.findIndex(l => l.parameters.id === data.currentListId)
    if (idx === undefined || idx === -1)
      return
    model.args.sequencesOfInterest![idx] = newValue
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
      <PlBtnGhost v-if="data.currentListId" @click.stop="() => data.settingsOpen = true">Settings
        <template #append>
          <PlMaskIcon24 name="settings" />
        </template>
      </PlBtnGhost>
    </template>

    <!-- <div :style="{ flex: 1 }">
      <AgGridVue :theme="AgGridTheme" :style="{ height: '100%' }" :rowData="result" :defaultColDef="defaultColDef"
        :columnDefs="columnDefs" :grid-options="gridOptions" :loadingOverlayComponentParams="{ notReady: true }"
        :loadingOverlayComponent=PlAgOverlayLoading :noRowsOverlayComponent=PlAgOverlayNoRows />
    </div> -->

    <PlSlideModal v-model="data.settingsOpen" v-if="currentList !== undefined">
      <template #title>Settings</template>
      <SOISettingsPanel v-model="currentList.parameters" />
    </PlSlideModal>
  </PlBlockPage>
</template>