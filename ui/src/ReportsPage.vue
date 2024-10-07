<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch } from 'vue';
import { ListOption, PlBlockPage, PlBtnGroup, PlDropdown, PlTextArea, SimpleOption } from '@platforma-sdk/ui-vue';

const app = useApp();

// TODO should be moved to model
const uiState = app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {},
  reportSelection: {
    type: 'alleles'
  },
  treeNodesGraphState: {
    title: "",
    chartType: "dendro",
    template: "dendro",
    optionsState: null,
    statisticsSettings: null,
    axesSettings: null,
    layersSettings: null,
    dataBindAes: null
  }
}))

type State = {
  donors?: ListOption<string>[]
}

const state = reactive({} as State)

watch(() => app.getOutputFieldOkOptional('allelesReports'), (reports) => {
  if (reports === undefined) {
    delete state.donors
    return
  }
  const donors = []
  for (const data of reports.data) {
    donors.push(data.key[0] as string)
  }
  // update selection choises
  state.donors = donors.map((donor) => ({ text: donor, value: donor }))

  // if previously selected donor isn't in available options, remove selection
  const selectedDonor = uiState.model.reportSelection.donor
  if (!(selectedDonor === undefined) && donors.find((o) => o === selectedDonor) === undefined) {
    delete uiState.model.reportSelection.donor
  }
}, { immediate: true })

// extract report to show
const reportText = computed(() => {
  const selecetedDonor = uiState.model.reportSelection.donor
  if (selecetedDonor === undefined) {
    return undefined
  }

  // choose an output to extract report from
  var field
  switch(uiState.model.reportSelection.type) {
    case 'alleles': {
      field = app.getOutputFieldOkOptional('allelesReports')
      break
    }
    case 'shmTrees': {
      field = app.getOutputFieldOkOptional('treesReports')
      break
    }
  }

  if (field === undefined) {
    return undefined
  }

  return field.data.find((data) => data.key[0] === selecetedDonor)?.value
})

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
    <template v-if="state.donors">
      <PlDropdown v-model=uiState.model.reportSelection.donor :options=state.donors clearable>Show for donor</PlDropdown>
      <PlBtnGroup v-model=uiState.model.reportSelection.type :options=reportOptions />
      <template v-if="uiState.model.reportSelection.donor">
        <template v-if="reportText">
          <PlTextArea v-model="reportText" :rows=50 />
        </template>
        <template v-else>
          Waiting...
        </template>
      </template>
    </template>
    <template v-else>
      Waiting for reports...
    </template>
  </PlBlockPage>
</template>
