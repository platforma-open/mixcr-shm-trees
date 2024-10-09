<script setup lang="ts">
import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { GraphMaker } from '@milaboratories/graph-maker'
import { computed, reactive, watch } from 'vue';
import { PlBlockPage, PlDropdown, PlRow, PlSpacer } from '@platforma-sdk/ui-vue';

import "@milaboratories/graph-maker/dist/style.css";
import { PColumnIdAndSpec } from '@platforma-sdk/model';
import { deepClone } from '@milaboratories/helpers';

// all available donor-treeId pairs
type DonorOptions = { 
  [index: string]: number[] 
}

type State = {
  // available columns to use
  columns?: PColumnIdAndSpec[],
  donors?: DonorOptions
}

const app = useApp();
const pFrameDriver = platforma.pFrameDriver

// TODO should be moved to model
app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {},
  reportSelection: {
    type: 'alleles'
  },
  treeNodesGraphState: {
    title: "",
    chartType: "dendro",
    template: "dendro"
  }
}))

const state = reactive({} as State)

watch(() => app.model.outputs.treeNodes, async (pframe) => {
  if (pframe === undefined) return
  // columns will be used in other places too
  state.columns = await pFrameDriver.listColumns(pframe)
  
  const column = state.columns[0]
  
  // TODO remove deepClone after fix of API
  // fetch all available donors 
  const donors = await pFrameDriver.getUniqueValues(pframe, deepClone({
    columnId: column.columnId,
    axis: column.spec.axesSpec[0],
    filters: [],
    limit: Number.MAX_SAFE_INTEGER
  }))

  const posibleValues = {} as DonorOptions
  // for each donor fetch available treeIds
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
      // in data Long is used, but ui works only with number
      posibleValues[donor as string].push(Number(treeId as bigint))
    }
  }

  state.donors = posibleValues
}, { immediate: true})

// TODO replace donorProperty with watch after fix of rewriting of uistate
const donorProperty = computed({
  get() { 
    return app.model.ui.treeSelectionForTreeNodesTable.donor 
  },
  set(donor) {
    app.model.ui.treeSelectionForTreeNodesTable.donor = donor
    // clean up selection of tree on donor update (the same id could be not available for a new donor)
    delete app.model.ui.treeSelectionForTreeNodesTable.treeId
  }
})

// TODO replace treeIdProperty with watch after fix of rewriting of uistate
const treeIdProperty = computed({
  get() { 
    return app.model.ui.treeSelectionForTreeNodesTable.treeId
  },
  set(treeId) {
    app.model.ui.treeSelectionForTreeNodesTable.treeId = treeId
    if (treeId === undefined || state.columns === undefined) {
      // clean up filters of graph maker
      delete app.model.ui.treeNodesGraphState.fixedOptions
    } else {
      const column = state.columns[0]
      // show default title
      app.model.ui.treeNodesGraphState.title = `${app.model.ui.treeSelectionForTreeNodesTable.donor ?? ""}/${treeId}`
      // add filters to graph maker, so it will use data only for the selected tree
      app.model.ui.treeNodesGraphState.fixedOptions = [
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: column.spec.axesSpec[0]
          },
          selectedFilterValue: app.model.ui.treeSelectionForTreeNodesTable.donor
        },
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: column.spec.axesSpec[1]
          },
          selectedFilterValue: treeId
        },
      ]
    }
  }
})

const donorOptions = computed(() => {
  if (state.donors === undefined) {
    return []
  }
  const result = []
  for (const donor in state.donors) {
    result.push({ text: donor, value: donor })
  }
  return result
})

const treesOptions = computed(() => {
  const selectedDonor = app.model.ui.treeSelectionForTreeNodesTable.donor
  if (state.donors === undefined || selectedDonor === undefined) {
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
        <PlDropdown :options="treesOptions ?? []" v-model=treeIdProperty label="Tree" clearable />
      </PlRow>
      <GraphMaker 
        v-if="app.outputs.treeNodes?.ok && app.outputs.treeNodes.value && 
        !(app.model.ui.treeSelectionForTreeNodesTable.donor === undefined || app.model.ui.treeSelectionForTreeNodesTable.treeId === undefined)"
        v-model=app.model.ui.treeNodesGraphState
        :p-frame-handle=app.outputs.treeNodes.value
        :p-frame-driver=platforma.pFrameDriver
        />
    </PlBlockPage>
  </template>
  <template v-else>loading...</template>
</template>
