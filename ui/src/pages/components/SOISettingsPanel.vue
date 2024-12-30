<script setup lang="ts">
import { ListOption, PlDropdown, PlTextField } from '@platforma-sdk/ui-vue';
import DownsamplingSettings from './DownsamplingSettings.vue';
import { Alphabet, createSOIListParameters, SearchParameters, SOIListParameters, TargetFeature } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { alphabetOptions, targetFeatureOptions } from '../../soi_util';

const model = defineModel<SOIListParameters>({ required: true })

const searchSettings: ListOption<SearchParameters>[] = [{
  value: { type: 'preset_alignment_search_top', dissimilarityPercent: 1 },
  label: 'Max dissimilarity 1%'
}, {
  value: { type: 'preset_alignment_search_top', dissimilarityPercent: 2 },
  label: 'Max dissimilarity 2%'
}, {
  value: { type: 'preset_alignment_search_top', dissimilarityPercent: 5 },
  label: 'Max dissimilarity 5%'
}, {
  value: { type: 'preset_alignment_search_top', dissimilarityPercent: 10 },
  label: 'Max dissimilarity 10%'
}, {
  value: { type: 'preset_alignment_search_top', dissimilarityPercent: 15 },
  label: 'Max dissimilarity 15%'
}, {
  value: { type: 'tree_search_top', parameters: 'oneMismatch' },
  label: 'Fuzzy exact: 1 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'oneMismatchOrIndel' },
  label: 'Fuzzy exact: 1 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'twoMismatches' },
  label: 'Fuzzy exact: 2 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'twoMismatchesOrIndels' },
  label: 'Fuzzy exact: 2 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'threeMismatches' },
  label: 'Fuzzy exact: 3 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'threeMismatchesOrIndels' },
  label: 'Fuzzy exact: 3 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'fourMismatches' },
  label: 'Fuzzy exact: 4 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'fourMismatchesOrIndels' },
  label: 'Fuzzy exact: 4 Mismatch Or Indel'
}]

</script>

<template>
  <PlDropdown :options="alphabetOptions" v-model="model.type" label="Alphabet" :disabled="true" />
  <PlDropdown :options="targetFeatureOptions" v-model="model.targetFeature" label="Target Feature" :disabled="true" />

  <PlTextField v-model="model.name" label="List name" />
  <PlDropdown :options="searchSettings" v-model="model.searchParameters" label="Sequence Search Parameters" />
</template>
