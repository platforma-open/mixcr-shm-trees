<script setup lang="ts">
import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';
import { computed, reactive, watch } from 'vue';
import { ListOption, PlBlockPage, PlBtnGroup, PlDropdown, PlTextArea, SimpleOption } from '@platforma-sdk/ui-vue';

const app = useApp();

const uiState = app.createUiModel({}, () => ({
  treeSelectionForTreeNodesTable: {},
  reportSelection: {
    type: 'alleles'
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
  state.donors = donors.map((donor) => ({ text: donor, value: donor }))

  // if previously selected donor isn't in available options, remove selection
  const selectedDonor = uiState.model.reportSelection.donor
  if (!(selectedDonor === undefined) && donors.find((o) => o === selectedDonor) === undefined) {
    delete uiState.model.reportSelection.donor
  }
}, { immediate: true })

const reportText = computed(() => {
  const selecetedDonor = uiState.model.reportSelection.donor
  if (selecetedDonor === undefined) {
    return undefined
  }

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

  const selectedReport = field.data.find((data) => data.key[0] === selecetedDonor)

  if (selectedReport === undefined || selectedReport.value === undefined) {
    return undefined
  }

  return selectedReport.value
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
