<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary } from '@milaboratories/uikit';
import { ColumnOption } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const app = useApp();
const args = app.createArgsModel();

type State = {
  allDatasetColumns?: ColumnOption[],
  selecetedAssembleFeature?: string
}

const state = reactive({} as State)

watch(() => app.getOutputFieldOkOptional("datasetColumnOptions"), (options) => {
  console.log("new dataset options", options)
  state.allDatasetColumns = options 
}, { immediate: true })

watch(() => app.args.donorColumn, (donorNew, donorOld) => {
  if (donorNew?.blockId !== donorOld?.blockId && donorNew?.name !== donorOld?.name) {
    console.log("change of the donor", donorOld, donorNew)
    delete state.allDatasetColumns
    // cleanup selection of datasets on change of donor column
    app.args.datasetColumns[0] = null
    app.args.datasetColumns.splice(1, app.args.datasetColumns.length - 1)
  }
})

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

const donorColumnOptions = computed(() =>
  app.getOutputFieldOkOptional("donorColumnOptions")?.map((v) => ({
    text: v.label,
    value: v.ref,
  }))
);

const supportedDatasetColumns = computed(() => {
  const columns = state.allDatasetColumns
  if (columns === undefined) return undefined

  return columns.filter((v) => {
    if (v.spec.annotations === undefined) return false
    const assemblingFeature = v.spec.annotations["mixcr.com/assemblingFeature"]
    if (assemblingFeature === undefined) return false
    if (assemblingFeature === "CDR3" || assemblingFeature === "[CDR3]") return false
    if (state.selecetedAssembleFeature === undefined) return true
    return state.selecetedAssembleFeature === assemblingFeature
  })
})

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
    <PlDropdown :options="donorColumnOptions ?? []" v-model="args.model.donorColumn" label="Select donor column" clearable />
    <template v-if="!(args.model.donorColumn === undefined) && supportedDatasetColumns === undefined">
      loading...
    </template>
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
        <div v-if="supportedDatasetColumns.length > args.model.datasetColumns.length" class="d-flex gap-8 align-center">
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