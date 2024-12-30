import { PlId, uniquePlId } from '@platforma-sdk/model';

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

export type SearchPresetTop = {
  type: 'preset_alignment_search_top';
  dissimilarityPercent: number;
};

export type SearchParameters = SearchParametersTreeSearchTop | SearchPresetTop;

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
    searchParameters: { type: 'preset_alignment_search_top', dissimilarityPercent: 2 }
  };
}

export type SOIList = {
  parameters: SOIListParameters;
  sequences: SequenceOfInterest[];
};
