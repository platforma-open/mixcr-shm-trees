import { Alphabet } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

export type SequenceValidationResult = {
  length: number;
  wildcards: number;
  unknownSymbols: number;
};

function initialValidationStats(): SequenceValidationResult {
  return { length: 0, unknownSymbols: 0, wildcards: 0 };
}

export class AlphabetHelper {
  /** true for main symbols, false for wildcards */
  public readonly symbols: Map<string, boolean>;
  constructor(
    public readonly type: Alphabet,
    public readonly humanReadableName: string,
    mainSymbols: string,
    wildcards: string
  ) {
    this.symbols = new Map();
    for (let i = 0; i < mainSymbols.length; ++i)
      this.symbols.set(mainSymbols.charAt(i).toLocaleLowerCase(), true);
    for (let i = 0; i < wildcards.length; ++i)
      this.symbols.set(wildcards.charAt(i).toLocaleLowerCase(), false);
  }

  validate(
    sequence: string,
    initialValue: SequenceValidationResult = initialValidationStats()
  ): SequenceValidationResult {
    let { length, wildcards, unknownSymbols } = initialValue;
    length += sequence.length;
    for (let i = 0; i < sequence.length; ++i) {
      const cv = this.symbols.get(sequence.charAt(i).toLocaleLowerCase());
      if (cv === false) wildcards++;
      else if (cv === undefined) unknownSymbols++;
    }
    return { length, wildcards, unknownSymbols };
  }
}

const NucleotideAlphabetHelper = new AlphabetHelper(
  'nucleotide',
  'Nucleotide',
  'ACGT',
  'RYSWKMBDHVN'
);
const AminoAcidAlphabetHelper = new AlphabetHelper(
  'amino-acid',
  'Amino Acid',
  'ACDEFGHIKLMNPQRSTVWY',
  'X'
);

const AllAlphabetHelpers = [NucleotideAlphabetHelper, AminoAcidAlphabetHelper];

export function detectAlphabet(sequences: string[]): AlphabetHelper | undefined {
  let validationStats = AllAlphabetHelpers.map((_) => initialValidationStats());
  for (let ai = 0; ai < AllAlphabetHelpers.length; ++ai)
    for (const s of sequences)
      validationStats[ai] = AllAlphabetHelpers[ai].validate(s, validationStats[ai]);
  let bestAIdx = 0;
  for (let ai = 1; ai < AllAlphabetHelpers.length; ++ai)
    if (
      validationStats[bestAIdx].unknownSymbols + validationStats[bestAIdx].wildcards >
      validationStats[ai].unknownSymbols + validationStats[ai].wildcards
    )
      bestAIdx = ai;
  const bestStats = validationStats[bestAIdx];
  if (
    bestStats.length === 0 ||
    bestStats.unknownSymbols > bestStats.length * 0.05 ||
    bestStats.wildcards > bestStats.length * 0.15
  )
    return undefined;
  return AllAlphabetHelpers[bestAIdx];
}

const GC_Bases = [
  'TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG',
  'TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG',
  'TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG'
];
const GC_AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';

function nToIdx(l: string): number {
  switch (l) {
    case 'T':
    case 't':
      return 0;
    case 'C':
    case 'c':
      return 1;
    case 'A':
    case 'a':
      return 2;
    case 'G':
    case 'g':
      return 3;
    default:
      throw new Error(`Unknown nucleotide: ${l}`);
  }
}

export function translate(nSeq: string): string {
  let i = 0;
  let result = '';
  while (i < nSeq.length - 2) {
    const triplet = [nSeq.charAt(i), nSeq.charAt(i + 1), nSeq.charAt(i + 2)];
    let hasWildcards = false;
    for (const c of triplet) {
      const cv = NucleotideAlphabetHelper.symbols.get(c.toLocaleLowerCase());
      if (cv === false) hasWildcards = true;
      else if (cv === undefined) throw new Error(`Unknown nucleotide: ${c}`);
    }
    if (hasWildcards) result += 'X';
    else
      result += GC_AA.charAt(nToIdx(triplet[0]) * 16 + nToIdx(triplet[1]) * 4 + nToIdx(triplet[2]));
    i += 3;
  }
  return result;
}
