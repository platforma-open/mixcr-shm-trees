<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary } from '@milaboratories/uikit';
import { ColumnOption } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const app = useApp();
const args = app.createArgsModel();

type State = {
  allDatasetColumns?: ColumnOption[],
  // all selected datasets should have the same assmble feature, otherwise it's not possible to run alleles and trees
  selecetedAssembleFeature?: string
}

const state = reactive({} as State)

// dataset options will be loaded with some delay. Copping it to state allow us to temporaly clean it up while loading
watch(() => app.getOutputFieldOkOptional("datasetColumnOptions"), (options) => {
  console.log("new dataset options", options)
  state.allDatasetColumns = options 
}, { immediate: true })

watch(() => app.args.donorColumn, (donorNew, donorOld) => {
  if (donorNew?.blockId !== donorOld?.blockId && donorNew?.name !== donorOld?.name) {
    console.log("change of the donor", donorOld, donorNew)
    // that will show loading message for the user while retriving new options
    delete state.allDatasetColumns
    // cleanup all selection of datasets on change of donor column
    app.args.datasetColumns[0] = null
    app.args.datasetColumns.splice(1, app.args.datasetColumns.length - 1)
  }
})

// update assemble feature to filter dataset options according to choise of the first dataset
watch(() => app.args.datasetColumns[0], (datasetColumnValue) => {
  console.log("change of seleceted first dataset", datasetColumnValue)
  if (state.allDatasetColumns === undefined || datasetColumnValue === null) {
    delete state.selecetedAssembleFeature
    return
  }

  const selectedAnnotations = state.allDatasetColumns.find((o) => o.ref.blockId === datasetColumnValue.blockId)?.spec?.annotations
  if (selectedAnnotations === undefined) {
    delete state.selecetedAssembleFeature
    return
  }  
  state.selecetedAssembleFeature = selectedAnnotations["mixcr.com/assemblingFeature"]
})

watch(() => state.selecetedAssembleFeature, (newValue, oldValue) => {
  console.log("change of selecetedAssembleFeature", oldValue, newValue)
  // case of cleaning up the state
  if (newValue === undefined) return

  if (newValue !== oldValue) {
    // cleanup selection of datasets, selected before should have different assembling feature
    app.args.datasetColumns.splice(1, app.args.datasetColumns.length - 1)
  }
})

// all datasets available without regard is it possible to run trees on them
const donorColumnOptions = computed(() =>
  app.getOutputFieldOkOptional("donorColumnOptions")?.map((v) => ({
    text: v.label,
    value: v.ref,
  }))
);

// select only datasets that could be used. Filter by assembling feature if any dataset is selected already
const supportedDatasetColumns = computed(() => {
  const columns = state.allDatasetColumns
  if (columns === undefined) return undefined

  return columns.filter((v) => {
    if (v.spec.annotations === undefined) return false
    const assemblingFeature = v.spec.annotations["mixcr.com/assemblingFeature"]
    // assemblingFeature should exists
    if (assemblingFeature === undefined) return false
    // assemblingFeature should not be just CDR3
    if (assemblingFeature === "CDR3" || assemblingFeature === "[CDR3]") return false
    if (state.selecetedAssembleFeature === undefined) return true
    // assemblingFeature should be the same for all selected datasets
    return state.selecetedAssembleFeature === assemblingFeature
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

</script>

<template>
  <PlBlockPage>
    <template #title>Settings</template>
    <template v-if="donorColumnOptions">
      <PlDropdown :options="donorColumnOptions" v-model="args.model.donorColumn" label="Select donor column" clearable />
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
  </PlBlockPage>
</template>