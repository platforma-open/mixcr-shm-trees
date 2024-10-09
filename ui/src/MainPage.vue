<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch, ref } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary, PlSlideModal, PlBtnGroup, PlTextArea } from '@platforma-sdk/ui-vue';
import { ColumnOption } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const app = useApp();
const args = app.createArgsModel();

type State = {
  allDatasetColumns?: ColumnOption[],
  // all selected datasets should have the same assmble feature, otherwise it's not possible to run alleles and trees
  selecetedAssembleFeature?: string
}

const state = reactive({} as State)

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

// dataset options will be loaded with some delay. Copping it to state allow us to temporaly clean it up while loading
watch(() => app.model.outputs.datasetColumnOptions, (options) => {
  state.allDatasetColumns = options 
}, { immediate: true })

watch(() => app.args.donorColumn, (donorNew, donorOld) => {
  if (donorNew?.blockId !== donorOld?.blockId && donorNew?.name !== donorOld?.name) {
    // that will show loading message for the user while retriving new options
    delete state.allDatasetColumns
    // cleanup all selection of datasets on change of donor column
    app.args.datasetColumns[0] = null
    app.args.datasetColumns.splice(1, app.args.datasetColumns.length - 1)
  }
})

// update assemble feature to filter dataset options according to choise of the first dataset
watch(() => app.args.datasetColumns[0], (datasetColumnValue) => {
  if (state.allDatasetColumns === undefined || datasetColumnValue === null) {
    delete state.selecetedAssembleFeature
    return
  }

  state.selecetedAssembleFeature = state.allDatasetColumns
    .find((o) => o.ref.blockId === datasetColumnValue.blockId)?.assemblingFeature
})

watch(() => state.selecetedAssembleFeature, (newValue, oldValue) => {
  // case of cleaning up the state
  if (newValue === undefined) return

  if (newValue !== oldValue) {
    // cleanup selection of datasets, selected before should have different assembling feature
    app.args.datasetColumns.splice(1, app.args.datasetColumns.length - 1)
  }
})

// select only datasets that could be used. Filter by assembling feature if any dataset is selected already
const supportedDatasetColumns = computed(() => {
  const columns = state.allDatasetColumns
  if (columns === undefined) return undefined

  return columns.filter((v) => {
    // assemblingFeature should exists
    if (v.assemblingFeature === undefined) return false
    // assemblingFeature should not be just CDR3
    if (v.assemblingFeature === "CDR3" || v.assemblingFeature === "[CDR3]") return false
    if (state.selecetedAssembleFeature === undefined) return true
    // assemblingFeature should be the same for all selected datasets
    return state.selecetedAssembleFeature === v.assemblingFeature
  })
})

// all supported options without already selected ones
function datasetOptionsForRow(i: number) {
  return computed(() => {
    const selectedOptions = new Set()
    args.model.datasetColumns.forEach((item, index) => {
      if (index != i && item !== null) {
        selectedOptions.add(item.blockId)
      }
    })

    return supportedDatasetColumns.value!.filter((item) => !selectedOptions.has(item.ref.blockId))?.map((v) => ({
      text: v.label,
      value: v.ref,
    }))
  })
}

function onAdd() {
  args.model.datasetColumns.push(null)
}

function onRemove(i: number) {
  args.model.datasetColumns.splice(i)
}

const settingsAreShown = ref(app.model.outputs.trees === undefined)

function showSettings() {
  settingsAreShown.value = true
}


const reportOptions = [
  {
    text: 'Alleles inference report',
    value: 'alleles'
  },
  {
    text: 'SHM trees reconstruction report',
    value: 'shmTrees'
  },
]

</script>

<template>
  <PlBlockPage>
    <template #title>Settings</template>
    <template #append>
      <PlBtnPrimary :icon="'settings-2'" @click.stop="showSettings">Settings</PlBtnPrimary>
    </template>


    <template v-if="app.model.outputs.availableDonorIds">
      <PlDropdown v-model=app.model.ui.reportSelection.donor :options=app.model.outputs.availableDonorIds clearable>Show for donor</PlDropdown>
      <PlBtnGroup v-model=app.model.ui.reportSelection.type :options=reportOptions />
      <template v-if="app.model.ui.reportSelection.donor">
        <template v-if="app.model.ui.reportSelection.type == 'alleles'">
          <PlTextArea v-if="app.model.outputs.allelesReports" v-model="app.model.outputs.allelesReports[app.model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
        <template v-if="app.model.ui.reportSelection.type == 'shmTrees'">
          <PlTextArea v-if="app.model.outputs.treesReports" v-model="app.model.outputs.treesReports[app.model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
      </template>
    </template>
    <template v-else>
      Waiting for reports...
    </template>



    <PlSlideModal v-model="settingsAreShown">
      <template v-if="app.model.outputs.donorColumnOptions">
        <PlDropdown :options="app.model.outputs.donorColumnOptions" v-model="args.model.donorColumn" label="Select donor column" clearable />
      </template>
      <template v-else>loading...</template>

      <template v-if="!(args.model.donorColumn === undefined) && supportedDatasetColumns === undefined">loading...</template>
      <template v-else-if="!(args.model.donorColumn === undefined || supportedDatasetColumns === undefined)">
        <template v-if="supportedDatasetColumns.length > 0">
          <div v-for="(dataset, index) in args.model.datasetColumns" class="d-flex gap-8 align-center">
            <PlDropdown 
              :options=datasetOptionsForRow(index).value
              v-model="args.model.datasetColumns[index]" 
              label="Select dataset"
            />
            <PlBtnPrimary v-if="index !== 0"
              icon="clear"
              size="small"
              @click=onRemove(index)
            />
          </div>
          <div v-if="supportedDatasetColumns.length > args.model.datasetColumns.length && args.model.datasetColumns[args.model.datasetColumns.length - 1] !== null" class="d-flex gap-8 align-center">
            <PlBtnPrimary
              icon="add"
              size="medium"
              @click=onAdd
            >
              Add dataset
            </PlBtnPrimary>
          </div>
        </template>
        <template v-else-if="state.allDatasetColumns!.length > 0">
          Available datasets could not be used to build SHM trees. Clones should be covered the same feature and it should broaded then CDR3
        </template>
        <template v-else>
          No datasets found
        </template>
      </template>
    </PlSlideModal>
  </PlBlockPage>
</template>