<script setup lang="ts">
import { ListOption, PlDropdown, PlTextField } from '@platforma-sdk/ui-vue';
import DownsamplingSettings from './DownsamplingSettings.vue';
import { Alphabet, createSOIListParameters, SearchParameters, SOIListParameters, TargetFeature } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

const model = defineModel<SOIListParameters>({ required: true })

const alphabets: ListOption<Alphabet>[] = [{
  value: 'nucleotide',
  label: 'Nucleotide'
}, {
  value: 'amino-acid',
  label: 'Amino Acid'
}]

const targetFeatures: ListOption<TargetFeature>[] = [{
  value: 'CDR3',
  label: 'CDR3'
}, {
  value: 'VDJRegion',
  label: 'VDJRegion'
}]

const searchSettings: ListOption<SearchParameters>[] = [{
  value: { type: 'tree_search_top', parameters: 'oneMismatch' },
  label: 'Fuzzy: 1 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'oneMismatchOrIndel' },
  label: 'Fuzzy: 1 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'twoMismatches' },
  label: 'Fuzzy: 2 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'twoMismatchesOrIndels' },
  label: 'Fuzzy: 2 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'threeMismatches' },
  label: 'Fuzzy: 3 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'threeMismatchesOrIndels' },
  label: 'Fuzzy: 3 Mismatch Or Indel'
}, {
  value: { type: 'tree_search_top', parameters: 'fourMismatches' },
  label: 'Fuzzy: 4 Mismatch'
}, {
  value: { type: 'tree_search_top', parameters: 'fourMismatchesOrIndels' },
  label: 'Fuzzy: 4 Mismatch Or Indel'
}]

</script>

<template>
  <PlTextField v-model="model.name" label="List name" />
  <PlDropdown :options="alphabets" v-model="model.type" label="Alphabet" />
  <PlDropdown :options="targetFeatures" v-model="model.targetFeature" label="Target Feature" />
  <PlDropdown :options="searchSettings" v-model="model.searchParameters" label="Sequence Search Parameters" />
</template>
