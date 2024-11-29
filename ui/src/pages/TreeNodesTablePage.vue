<script setup lang="ts">
import { GraphMaker } from '@milaboratories/graph-maker';
import '@milaboratories/graph-maker/styles';
import { deepClone } from '@milaboratories/helpers';
import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { PColumnIdAndSpec } from '@platforma-sdk/model';
import { ListOption, PlBlockPage, PlBtnGroup, PlDropdown, PlRow, PlSpacer } from '@platforma-sdk/ui-vue';
import { computed, reactive, watch } from 'vue';
import { useApp } from '../app';

// all available donor-treeId pairs
type DonorOptions = { 
  [index: string]: number[] 
}

type State = {
  // available columns to use
  column?: PColumnIdAndSpec,
  donors?: DonorOptions,
  hasSubtree: boolean,
  subtreeOptions?: ListOption<number>[]
}

const app = useApp();
const pFrameDriver = model.pFrameDriver

const state = reactive({
  hasSubtree: false
} as State)

watch(() => app.model.outputs.treeNodes, async (pframe) => {
  if (pframe === undefined) return
  // columns will be used in other places too
  const columns = await pFrameDriver.listColumns(pframe)
  
  const column = columns[0]
  state.column = column

  // check if there is subtreeId in axes
  state.hasSubtree = column.spec.axesSpec[2].name === "pl7.app/dendrogram/subtreeId"
  
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
    // clean up selection of subtree on tree update (will be set to default option after load of options for subtrees)
    delete app.model.ui.treeSelectionForTreeNodesTable.subtreeId
    updateGraphMaker()
  }
})

// TODO replace subTreeIdProperty with watch after fix of rewriting of uistate
const subTreeIdProperty = computed({
  get() { 
    return app.model.ui.treeSelectionForTreeNodesTable.subtreeId
  },
  set(subtreeId) {
    app.model.ui.treeSelectionForTreeNodesTable.subtreeId = subtreeId
    updateGraphMaker()
  }
})

function updateGraphMaker() {
  const donorId = app.model.ui.treeSelectionForTreeNodesTable.donor
  const treeId = app.model.ui.treeSelectionForTreeNodesTable.treeId
  if (state.hasSubtree) {
    const subtreeId = app.model.ui.treeSelectionForTreeNodesTable.subtreeId
    if (donorId === undefined || treeId === undefined || subtreeId === undefined || state.column === undefined) {
      // clean up filters of graph maker
      delete app.model.ui.treeNodesGraphState.fixedOptions
    } else {
      const labelForSubtree = state.subtreeOptions?.find((option) => option.value === subtreeId)?.value ?? subtreeId
      // show default title
      app.model.ui.treeNodesGraphState.title = `${donorId}/${treeId} ${labelForSubtree}`
      // add filters to graph maker, so it will use data only for the selected tree
      app.model.ui.treeNodesGraphState.fixedOptions = [
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: state.column.spec.axesSpec[0]
          },
          selectedFilterValue: donorId
        },
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: state.column.spec.axesSpec[1]
          },
          selectedFilterValue: treeId
        },
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: state.column.spec.axesSpec[2]
          },
          selectedFilterValue: subtreeId
        },
      ]
    }
  } else {
    if (donorId === undefined || treeId === undefined || state.column === undefined) {
      // clean up filters of graph maker
      delete app.model.ui.treeNodesGraphState.fixedOptions
    } else {
      // show default title
      app.model.ui.treeNodesGraphState.title = `${donorId}/${treeId}`
      // add filters to graph maker, so it will use data only for the selected tree
      app.model.ui.treeNodesGraphState.fixedOptions = [
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: state.column.spec.axesSpec[0]
          },
          selectedFilterValue: donorId
        },
        {
          inputName: 'filters',
          selectedSource: {
            type: 'axis',
            id: state.column.spec.axesSpec[1]
          },
          selectedFilterValue: treeId
        },
      ]
    }
  }
}

watch(() => [app.model.ui.treeSelectionForTreeNodesTable.donor, app.model.ui.treeSelectionForTreeNodesTable.treeId, state.column], async (newValues, oldValues) => {
  const column = newValues[2] as PColumnIdAndSpec | undefined
  if (column === undefined) {
    // waiting for data from backend
    return
  }
  const donorId = newValues[0] as string | undefined
  const treeId = newValues[1] as number | undefined
  if (donorId === undefined || treeId === undefined) {
    // nothing to select from
    delete state.subtreeOptions
    return
  }
  // input changed or it's the first run with resolved column
  if (oldValues === undefined || donorId !== oldValues[0] || treeId !== oldValues[1] || oldValues[2] === undefined) {
    // remove stale options
    delete state.subtreeOptions

    const pframe = app.model.outputs.treeNodes!

    const subtreeIds = await pFrameDriver.getUniqueValues(pframe!, deepClone({
      columnId: column.columnId,
      axis: column.spec.axesSpec[2],
      filters: [
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: column.spec.axesSpec[0]
          },
          predicate: {
            operator: 'Equal',
            reference: donorId
          }
        },
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: column.spec.axesSpec[1]
          },
          predicate: {
            operator: 'Equal',
            reference: treeId
          }
        },
      ],
      limit: Number.MAX_SAFE_INTEGER
    }))

    // check that user doesn't select something new while we were waiting for new options
    if (app.model.ui.treeSelectionForTreeNodesTable.donor === donorId && app.model.ui.treeSelectionForTreeNodesTable.treeId === treeId) {
      const options = [] as ListOption<number>[]
      for (var subtreeId of subtreeIds.values.data) {
        subtreeId = Number(subtreeId as bigint)
        // TODO get good labels for subtrees from somewhere. It should be like `IGHV3-3/IGHJ6-1`
        options.push({ value: subtreeId, text: subtreeId.toString()})
      }
      state.subtreeOptions = options
      if (app.model.ui.treeSelectionForTreeNodesTable.subtreeId === undefined) {
        app.model.ui.treeSelectionForTreeNodesTable.subtreeId = options[0].value
        updateGraphMaker()
      }
    }
  }
}, { immediate: true})

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

function dontShowGraphMaker() {
  if (app.model.outputs.treeNodes === undefined) {
    return true
  }
  if (state.hasSubtree) {
    return app.model.ui.treeSelectionForTreeNodesTable.donor === undefined || 
      app.model.ui.treeSelectionForTreeNodesTable.treeId === undefined || 
      app.model.ui.treeSelectionForTreeNodesTable.subtreeId === undefined
  } else {
    return app.model.ui.treeSelectionForTreeNodesTable.donor === undefined || 
      app.model.ui.treeSelectionForTreeNodesTable.treeId === undefined
  }
}

</script>

<template>
  <template v-if="state.donors">
    <PlBlockPage>
      <PlRow>
        <PlDropdown :options="donorOptions ?? []" v-model=donorProperty label="Donor" clearable />
        <PlSpacer/>
        <PlDropdown :options="treesOptions ?? []" v-model=treeIdProperty label="Tree" clearable />
        <template v-if="state.hasSubtree">
          <PlSpacer/>
          <template v-if="state.subtreeOptions">
            <PlBtnGroup :options=state.subtreeOptions v-model="subTreeIdProperty"/>
          </template>
        </template>
      </PlRow>
      <GraphMaker 
        v-if=!dontShowGraphMaker()
        v-model=app.model.ui.treeNodesGraphState
        :p-frame=app.model.outputs.treeNodes
        />
    </PlBlockPage>
  </template>
  <template v-else>loading...</template>
</template>
