<script setup lang="ts">
import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { GraphMaker } from '@milaboratories/graph-maker'
import { computed, Ref, watch } from 'vue';
import { PlBlockPage, PlBtnGroup, PlDropdown, PlRow, PlSpacer } from '@platforma-sdk/ui-vue';

import "@milaboratories/graph-maker/dist/style.css";
import { PColumnIdAndSpec, PFrameHandle } from '@platforma-sdk/model';
import { deepClone } from '@milaboratories/helpers';
import { asyncComputed } from '@vueuse/core';
import { retentive } from './retentive';

// all available donor-treeId pairs
type DonorOptions = {
  [index: string]: number[]
}

const app = useApp();
const pFrameDriver = platforma.pFrameDriver

const nodesPFrame = retentive(() => app.model.outputs.treeNodes);

const vGeneColumn = asyncComputed(async () => {
  const pFrame = nodesPFrame.value;
  if (pFrame === undefined) return undefined;
  const columns = await pFrameDriver.listColumns(pFrame)
  console.dir(columns, { depth: 5 });
  return columns.find(c => c.spec.name === "pl7.app/vdj/geneHit" && c.spec.domain?.['pl7.app/vdj/reference'] === 'VGene')
})

const pComputed = <T>(cb: (pFrame: PFrameHandle, vColumn: PColumnIdAndSpec) => Promise<T>): Ref<T | undefined> =>
  asyncComputed(async () => {
    // sync part where reactive values access is captured
    const pFrame = nodesPFrame.value;
    if (pFrame === undefined)
      return undefined;
    const vColumn = vGeneColumn.value;
    if (vColumn === undefined)
      return undefined;
    // sync section can continue inside the callback below antil the first "await"
    return await cb(pFrame, vColumn);
  })

const hasSubtrees = computed(() => vGeneColumn.value === undefined
  ? undefined
  : vGeneColumn.value.spec.axesSpec[2].name === "pl7.app/dendrogram/subtreeId")

const donors = pComputed(async (pFrame, vColumn) => {
  const donors = await pFrameDriver.getUniqueValues(pFrame, deepClone({
    columnId: vColumn.columnId,
    axis: vColumn.spec.axesSpec[0],
    filters: [],
    limit: Number.MAX_SAFE_INTEGER
  }))
  const posibleValues = {} as DonorOptions
  // for each donor fetch available treeIds
  for (const donor of donors.values.data) {
    // TODO remove deepClone after fix of API
    const treeIds = await pFrameDriver.getUniqueValues(pFrame, deepClone({
      columnId: vColumn.columnId,
      axis: vColumn.spec.axesSpec[1],
      filters: [
        {
          type: 'bySingleColumn',
          column: {
            type: 'axis',
            id: vColumn.spec.axesSpec[0]
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
    return posibleValues;
  }
})

const donorOptions = computed(() => {
  if (donors === undefined)
    return []
  const result = []
  for (const donor in donors.value)
    result.push({ label: donor, value: donor })
  return result
})

watch(donorOptions, (options) => {
  if (app.model.ui.treeSelectionForTreeVisualization.donor === undefined && options.length > 0)
    app.model.ui.treeSelectionForTreeVisualization.donor = options[0].value;
})

const treesOptions = computed(() => {
  const selectedDonor = app.model.ui.treeSelectionForTreeVisualization.donor
  if (donors.value === undefined || selectedDonor === undefined)
    return []
  const treeIds = donors.value[selectedDonor] ?? []
  const result = []
  for (const treeId of treeIds)
    result.push({ label: treeId.toString(), value: treeId })
  return result
})

watch(treesOptions, (options) => {
  if (app.model.ui.treeSelectionForTreeVisualization.treeId === undefined && options.length > 0)
    app.model.ui.treeSelectionForTreeVisualization.treeId = options[0].value;
})

const subtreesOptions = pComputed(async (pFrame, vColumn) => {
  if (hasSubtrees.value !== true) return undefined;
  const { donor, treeId } = app.model.ui.treeSelectionForTreeVisualization
  if (donor === undefined || treeId == undefined) return []

  const subtreeIds = await pFrameDriver.getUniqueValues(pFrame, deepClone({
    columnId: vColumn.columnId,
    axis: vColumn.spec.axesSpec[2],
    filters: [
      {
        type: 'bySingleColumn',
        column: {
          type: 'axis',
          id: vColumn.spec.axesSpec[0]
        },
        predicate: {
          operator: 'Equal',
          reference: donor
        }
      },
      {
        type: 'bySingleColumn',
        column: {
          type: 'axis',
          id: vColumn.spec.axesSpec[1]
        },
        predicate: {
          operator: 'Equal',
          reference: treeId
        }
      },
    ],
    limit: Number.MAX_SAFE_INTEGER
  }))

  const result = []
  for (const subtreeId of subtreeIds.values.data)
    result.push({ label: subtreeId!.toString(), value: treeId })

  console.dir(result, { depth: 5 })

  return result
})

watch(subtreesOptions, (options) => {
  if (hasSubtrees.value !== true) return;
  if (options && app.model.ui.treeSelectionForTreeVisualization.subtreeId === undefined && options.length > 0)
    app.model.ui.treeSelectionForTreeVisualization.subtreeId = options[0].value;
})

// TODO replace donorProperty with watch after fix of rewriting of uistate
const donorProperty = computed({
  get() {
    return app.model.ui.treeSelectionForTreeVisualization.donor
  },
  set(donor) {
    app.model.ui.treeSelectionForTreeVisualization.donor = donor
    // clean up selection of tree on donor update (the same id could be not available for a new donor)
    delete app.model.ui.treeSelectionForTreeVisualization.treeId
  }
})

// TODO replace treeIdProperty with watch after fix of rewriting of uistate
const treeIdProperty = computed({
  get() {
    return app.model.ui.treeSelectionForTreeVisualization.treeId
  },
  set(treeId) {
    app.model.ui.treeSelectionForTreeVisualization.treeId = treeId
    // clean up selection of subtree on tree update (will be set to default option after load of options for subtrees)
    delete app.model.ui.treeSelectionForTreeVisualization.subtreeId
  }
})

// TODO replace subTreeIdProperty with watch after fix of rewriting of uistate
const subTreeIdProperty = computed({
  get() {
    return app.model.ui.treeSelectionForTreeVisualization.subtreeId
  },
  set(subtreeId) {
    app.model.ui.treeSelectionForTreeVisualization.subtreeId = subtreeId
  }
})

watch(() => [app.model.ui.treeSelectionForTreeVisualization, vGeneColumn.value, hasSubtrees.value] as const,
  ([{ donor, treeId, subtreeId }, vColumn, withSubtrees]) => {
    if (withSubtrees === undefined || vColumn === undefined) return;

    if (withSubtrees) {
      if (donor === undefined || treeId === undefined || subtreeId === undefined) {
        // clean up filters of graph maker
        delete app.model.ui.treeNodesGraphState.fixedOptions
      } else {
        const labelForSubtree = subtreesOptions.value?.find((option) => option.value === subtreeId)?.value ?? subtreeId
        // show default title
        app.model.ui.treeNodesGraphState.title = `${donor}/${treeId} ${labelForSubtree}`

        // add filters to graph maker, so it will use data only for the selected tree
        app.model.ui.treeNodesGraphState.fixedOptions = [
          {
            inputName: 'filters',
            selectedSource: {
              type: 'axis',
              id: vColumn.spec.axesSpec[0]
            },
            selectedFilterValue: donor
          },
          {
            inputName: 'filters',
            selectedSource: {
              type: 'axis',
              id: vColumn.spec.axesSpec[1]
            },
            selectedFilterValue: treeId
          },
          {
            inputName: 'filters',
            selectedSource: {
              type: 'axis',
              id: vColumn.spec.axesSpec[2]
            },
            selectedFilterValue: subtreeId
          },
        ]
      }
    } else {
      if (donor === undefined || treeId === undefined) {
        // clean up filters of graph maker
        delete app.model.ui.treeNodesGraphState.fixedOptions
      } else {
        // show default title
        app.model.ui.treeNodesGraphState.title = `${donor}/${treeId}`

        // add filters to graph maker, so it will use data only for the selected tree
        app.model.ui.treeNodesGraphState.fixedOptions = [
          {
            inputName: 'filters',
            selectedSource: {
              type: 'axis',
              id: vColumn.spec.axesSpec[0]
            },
            selectedFilterValue: donor
          },
          {
            inputName: 'filters',
            selectedSource: {
              type: 'axis',
              id: vColumn.spec.axesSpec[1]
            },
            selectedFilterValue: treeId
          },
        ]
      }
    }

    // const column = newValues[2] as PColumnIdAndSpec | undefined
    // if (column === undefined) {
    //   // waiting for data from backend
    //   return
    // }
    // const donorId = newValues[0] as string | undefined
    // const treeId = newValues[1] as number | undefined
    // if (donorId === undefined || treeId === undefined) {
    //   // nothing to select from
    //   delete state.subtreeOptions
    //   return
    // }
    // // input changed or it's the first run with resolved column
    // if (oldValues === undefined || donorId !== oldValues[0] || treeId !== oldValues[1] || oldValues[2] === undefined) {
    //   // remove stale options
    //   delete state.subtreeOptions

    //   const pframe = app.model.outputs.treeNodes!

    //   // check that user doesn't select something new while we were waiting for new options
    //   if (app.model.ui.treeSelectionForTreeVisualization.donor === donorId && app.model.ui.treeSelectionForTreeVisualization.treeId === treeId) {
    //     const options = [] as ListOption<number>[]
    //     for (var subtreeId of subtreeIds.values.data) {
    //       subtreeId = Number(subtreeId as bigint)
    //       // TODO get good labels for subtrees from somewhere. It should be like `IGHV3-3/IGHJ6-1`
    //       options.push({ value: subtreeId, text: subtreeId.toString() })
    //     }
    //     state.subtreeOptions = options
    //     if (app.model.ui.treeSelectionForTreeVisualization.subtreeId === undefined) {
    //       app.model.ui.treeSelectionForTreeVisualization.subtreeId = options[0].value
    //       updateGraphMaker()
    //     }
    //   }
    // }
  }, { immediate: true, deep: true })

function dontShowGraphMaker() {
  if (app.model.outputs.treeNodes === undefined) {
    return true
  }
  if (hasSubtrees.value) {
    return app.model.ui.treeSelectionForTreeVisualization.donor === undefined ||
      app.model.ui.treeSelectionForTreeVisualization.treeId === undefined ||
      app.model.ui.treeSelectionForTreeVisualization.subtreeId === undefined
  } else {
    return app.model.ui.treeSelectionForTreeVisualization.donor === undefined ||
      app.model.ui.treeSelectionForTreeVisualization.treeId === undefined
  }
}

</script>

<template>
  <template v-if="donors">
    <PlBlockPage>
      <PlRow>
        <PlDropdown :options="donorOptions ?? []" v-model=donorProperty label="Donor" clearable />
        <PlSpacer />
        <PlDropdown :options="treesOptions ?? []" v-model=treeIdProperty label="Tree" clearable />
        <template v-if="hasSubtrees">
          <PlSpacer />
          <template v-if="subtreesOptions">
            <PlBtnGroup :options=subtreesOptions v-model="subTreeIdProperty" />
          </template>
        </template>
      </PlRow>
      <GraphMaker v-if=!dontShowGraphMaker() v-model=app.model.ui.treeNodesGraphState
        :p-frame=app.model.outputs.treeNodes :p-frame-driver=platforma.pFrameDriver />
    </PlBlockPage>
  </template>
  <template v-else>loading...</template>
</template>
