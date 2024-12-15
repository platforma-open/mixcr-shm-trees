import { PlId, uniquePlId } from './helpers';

export type SequenceOfInterest = {
  id: PlId;
  name: string;
  sequence: string;
};

export type KnownTreeSearchParameters =
  | 'oneMismatch'
  | 'oneMismatchOrIndel'
  | 'twoMismatches'
  | 'twoMismatchesOrIndels'
  | 'threeMismatches'
  | 'threeMismatchesOrIndels'
  | 'fourMismatches'
  | 'fourMismatchesOrIndels';

export type SearchParametersTreeSearchTop = {
  type: 'tree_search_top';
  parameters: KnownTreeSearchParameters;
};

export type SearchParameters = SearchParametersTreeSearchTop;

export type Alphabet = 'nucleotide' | 'amino-acid';
export type TargetFeature = 'CDR3' | 'VDJRegion';

export type SOIListParameters = {
  id: PlId;
  name: string;
  type: Alphabet;
  targetFeature: TargetFeature;
  searchParameters: SearchParameters;
};

export function createSOIListParameters(name: string = 'Sequence List'): SOIListParameters {
  return {
    id: uniquePlId(),
    name,
    targetFeature: 'CDR3',
    type: 'nucleotide',
    searchParameters: { type: 'tree_search_top', parameters: 'oneMismatch' }
  };
}

export type SOIList = {
  parameters: SOIListParameters;
  sequences: SequenceOfInterest[];
};
