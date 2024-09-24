<script setup lang="ts">
import { platforma } from '@milaboratory/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computedAsync } from '@vueuse/core';
import { GraphMakerSettings } from "@milaboratory/graph-maker/dist/GraphMaker/types";
import { GraphMaker } from '@milaboratory/graph-maker'
import { computed } from 'vue';
import { PlBlockPage, PlDropdown, PlRow, PlSpacer } from '@milaboratory/sdk-vue';
import { ref } from "vue";

import "@milaboratory/graph-maker/dist/style.css";
import "@milaboratory/platforma-uikit/lib/dist/style.css";

type DonorOptions = { [index: string]: number[] }

const app = useApp();

const uiState = app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {}
}))

const pframe = app.getOutputFieldOkOptional('treeNodes')!

const pFrameDriver = platforma.pFrameDriver

const donors = computedAsync(async () => {
  const columns = await pFrameDriver.listColumns(pframe)
  const column = columns[0]
  
  const donors = await platforma.pFrameDriver.getUniqueValues(pframe, {
    columnId: column.columnId,
    axis: column.spec.axesSpec[0],
    filters: [],
    limit: Number.MAX_SAFE_INTEGER
  })

  const posibleValues = {} as DonorOptions
  for (const donor of donors.values.data) {
    const treeIds = await platforma.pFrameDriver.getUniqueValues(pframe, {
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
    })
    posibleValues[donor as string] = []
    for (const treeId of treeIds.values.data) {
      posibleValues[donor as string].push(Number(treeId as bigint))
    }
  }

  return posibleValues
})

const donorOptions = computed(() => {
  const result = []
  if (donors.value === undefined) {
    return []
  }
  for (const donor in donors.value) {
    result.push({ text: donor, value: donor })
  }
  return result
})

const treesOptions = computed(() => {
  const selectedDonor = uiState.model.treeSelectionForTreeNodesTable.donor
  if (donors.value === undefined || selectedDonor === undefined || selectedDonor === null) {
    return []
  } 
  const treeIds = donors.value[selectedDonor] ?? []
  const result = []
  for (const treeId of treeIds) {
    result.push({ text: treeId.toString(), value: treeId })
  }
  return result
})

const settings = computedAsync(async () => {
  const columns = await pFrameDriver.listColumns(pframe)
  const column = columns[0]
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
});

</script>

<template>
  <PlBlockPage>
    <PlRow>
      <PlDropdown :options="donorOptions ?? []" v-model="uiState.model.treeSelectionForTreeNodesTable.donor" label="Donor" clearable />
      <PlSpacer/>
      <PlDropdown :options="treesOptions ?? []" v-model="uiState.model.treeSelectionForTreeNodesTable.treeId" label="Tree" clearable />
    </PlRow>
    <GraphMaker 
      v-if="app.outputs.treeNodes?.ok && app.outputs.treeNodes.value && 
      !(uiState.model.treeSelectionForTreeNodesTable.donor === undefined || uiState.model.treeSelectionForTreeNodesTable.treeId === undefined)"
      :p-frame-handle="app.outputs.treeNodes.value"
      :settings="settings"
      :p-frame-driver="platforma.pFrameDriver"
      graph-title="Title"
      />
  </PlBlockPage>
</template>
