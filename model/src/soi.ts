import { PlId } from './helpers';

export type SequenceOfInterest = {
  name: string;
  sequence: string;
};

export type FuzzySearchParameters = {
  maxNumberOfErrors: number;
  maxNumberOfIndels: number;
};

export type SOIList = {
  id: PlId;
  name: string;
  type: 'nucleotide' | 'amino-acid';
  targetFeature: 'CDR3' | 'VDJRegion';

  sequences: SequenceOfInterest[];
};
