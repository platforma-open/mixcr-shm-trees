<script setup lang="ts">
import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { GraphMakerSettings } from '@milaboratories/graph-maker/dist/GraphMaker/types';
import { GraphMaker } from '@milaboratories/graph-maker'
import { computed, reactive, watch } from 'vue';
import { PlBlockPage, PlDropdown, PlRow, PlSpacer } from '@platforma-sdk/ui-vue';

import "@milaboratories/graph-maker/dist/style.css";
import { PColumnIdAndSpec } from '@platforma-sdk/model';
import { deepClone } from '@milaboratories/helpers';

type DonorOptions = { 
  [index: string]: number[] 
}

type State = {
  columns?: PColumnIdAndSpec[],
  donors?: DonorOptions
}

const app = useApp();
const pFrameDriver = platforma.pFrameDriver

const uiState = app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {},
  reportSelection: {
    type: 'alleles'
  }
}))

const state = reactive({} as State)

watch(() => app.getOutputFieldOkOptional('treeNodes'), async (pframe) => {
  if (pframe === undefined) return
  state.columns = await pFrameDriver.listColumns(pframe)
  
  const column = state.columns[0]
  
  // TODO remove deepClone after fix of API
  const donors = await pFrameDriver.getUniqueValues(pframe, deepClone({
    columnId: column.columnId,
    axis: column.spec.axesSpec[0],
    filters: [],
    limit: Number.MAX_SAFE_INTEGER
  }))

  const posibleValues = {} as DonorOptions
  for (const donor of donors.values.data) {
    // TODO remove deepClone after fix of API
    const treeIds = await pFrameDriver.getUniqueValues(pframe, deepClone({
      columnId: column.columnId,
      axis: column.spec.axesSpec[1],
      filters: [
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: column.spec.axesSpec[0]
          },
          predicate: {
            operator: 'Equal',
            reference: donor as string
          }
       }
      ],
      limit: Number.MAX_SAFE_INTEGER
    }))
    posibleValues[donor as string] = []
    for (const treeId of treeIds.values.data) {
      posibleValues[donor as string].push(Number(treeId as bigint))
    }
  }

  state.donors = posibleValues
}, { immediate: true})

// watch(() => uiState.model.treeSelectionForTreeNodesTable.donor, (newDonorValue, oldDonorValue) => {
//   if (newDonorValue !== oldDonorValue) {
//     uiState.model.treeSelectionForTreeNodesTable.treeId = undefined
//   }
// })

// TODO replace donorProperty with watch above after fix of rewriting of uistate
const donorProperty = computed({
  get() { 
    return uiState.model.treeSelectionForTreeNodesTable.donor 
  },
  set(donor) {
    uiState.model.treeSelectionForTreeNodesTable.donor = donor
    delete uiState.model.treeSelectionForTreeNodesTable.treeId
  }
})

// TODO save up changes
const settings = computed(() => {
  if (state.columns === undefined || state.columns.length === 1) return undefined
  const column = state.columns[0]
  return {
    chartType: "dendro",
    template: "dendro",
    optionsState: null,
    statisticsSettings: null,
    axesSettings: null,
    layersSettings: null,
    dataBindAes: null,
    fixedOptions: [
      {
        inputName: 'filters',
        selectedSource: {
          type: 'axis',
          id: column.spec.axesSpec[0]
        },
        selectedFilterValue: uiState.model.treeSelectionForTreeNodesTable.donor
      },
      {
        inputName: 'filters',
        selectedSource: {
          type: 'axis',
          id: column.spec.axesSpec[1]
        },
        selectedFilterValue: uiState.model.treeSelectionForTreeNodesTable.treeId
      },
    ]
  } satisfies GraphMakerSettings
})


const donorOptions = computed(() => {
  const result = []
  if (state.donors === undefined) {
    return []
  }
  for (const donor in state.donors) {
    result.push({ text: donor, value: donor })
  }
  return result
})

const treesOptions = computed(() => {
  const selectedDonor = uiState.model.treeSelectionForTreeNodesTable.donor
  if (state.donors === undefined || selectedDonor === undefined || selectedDonor === null) {
    return []
  } 
  const treeIds = state.donors[selectedDonor] ?? []
  const result = []
  for (const treeId of treeIds) {
    result.push({ text: treeId.toString(), value: treeId })
  }
  return result
})

</script>

<template>
  <template v-if="state.donors">
    <PlBlockPage>
      <PlRow>
        <PlDropdown :options="donorOptions ?? []" v-model=donorProperty label="Donor" clearable />
        <PlSpacer/>
        <PlDropdown :options="treesOptions ?? []" v-model=uiState.model.treeSelectionForTreeNodesTable.treeId label="Tree" clearable />
      </PlRow>
      <!-- TODO generate and save title -->
      <GraphMaker 
        v-if="app.outputs.treeNodes?.ok && app.outputs.treeNodes.value && 
        !(uiState.model.treeSelectionForTreeNodesTable.donor === undefined || uiState.model.treeSelectionForTreeNodesTable.treeId === undefined || settings === undefined)"
        :p-frame-handle=app.outputs.treeNodes.value
        :settings=settings
        @settings-update=""
        :p-frame-driver=platforma.pFrameDriver
        graph-title="Title"
        @graph-title-update=""
        />
    </PlBlockPage>
  </template>
  <template v-else>loading...</template>
</template>
