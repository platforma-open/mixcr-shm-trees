import { SimpleOption } from '@platforma-sdk/ui-vue';

export type StepId = 'alleles' | 'trees';

export const Steps: StepId[] = ['alleles', 'trees'];

export type ByStepIdRecord<T> = {
  alleles: T;
  trees: T;
};

export const StepIdSimpleOptions: SimpleOption<StepId>[] = [
  { value: 'alleles', text: 'Allele Reconstruction' },
  { value: 'trees', text: 'Tree Reconstruction' }
];
