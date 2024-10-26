<script setup lang="ts">
import { useApp } from './app';
import { computed, reactive, watch, ref } from 'vue';
import { PlBlockPage, PlDropdown, PlBtnPrimary, PlSlideModal, PlBtnGroup, PlTextArea, PlDropdownRef, ListOption, PlBtnGhost } from '@platforma-sdk/ui-vue';
import { TreeResultsFull } from './results';
import { retentive } from './retentive';
import { Ref as ModelRef, Option } from '@platforma-sdk/model';
import { Branded, notEmpty } from '@milaboratories/helpers';
import { fromRefString, RefString, toRefString } from './util';
import SettingsPanel from './SettingsPanel.vue';

const { model } = useApp();

const data = reactive({
  settingsOpen: model.args.donorColumn === undefined || model.args.datasetColumns.length === 0
})

watch(TreeResultsFull, v => {
  console.dir(v);
}, { immediate: true })
</script>

<template>
  <PlBlockPage>
    <template #title>Settings</template>
    <template #append>
      <PlBtnGhost :icon="'settings-2'" @click.stop="() => data.settingsOpen = true">Settings</PlBtnGhost>
    </template>

    <!-- <template v-if="model.outputs.targetDonorIds">
      <PlDropdown v-model=model.ui.reportSelection.donor :options=model.outputs.availableDonorIds clearable>Show for donor</PlDropdown>
      <PlBtnGroup v-model=model.ui.reportSelection.type :options=reportOptions />
      <template v-if="model.ui.reportSelection.donor">
        <template v-if="model.ui.reportSelection.type == 'alleles'">
          <PlTextArea v-if="model.outputs.allelesReports" v-model="model.outputs.allelesReports[model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
        <template v-if="model.ui.reportSelection.type == 'shmTrees'">
          <PlTextArea v-if="model.outputs.treesReports" v-model="model.outputs.treesReports[model.ui.reportSelection.donor]" :rows=50 />
          <template v-else>
            Waiting...
          </template>
        </template>
      </template>
    </template>
    <template v-else>
      Waiting for reports...
    </template> -->

    <PlSlideModal v-model="data.settingsOpen">
      <SettingsPanel />
    </PlSlideModal>
  </PlBlockPage>
</template>