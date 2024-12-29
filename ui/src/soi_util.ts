import { Alphabet, TargetFeature } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { ListOption } from '@platforma-sdk/ui-vue';

export const alphabetOptions: ListOption<Alphabet>[] = [
  {
    value: 'nucleotide',
    label: 'Nucleotide'
  },
  {
    value: 'amino-acid',
    label: 'Amino Acid'
  }
];

export const targetFeatureOptions: ListOption<TargetFeature>[] = [
  {
    value: 'CDR3',
    label: 'CDR3'
  },
  {
    value: 'VDJRegion',
    label: 'VDJRegion'
  }
];
