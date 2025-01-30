import { Alphabet } from '@platforma-open/milaboratories.mixcr-shm-trees.model';

export type SequenceValidationResult = {
  readonly alphabetHelper: AlphabetHelper;
  length: number;
  wildcards: number;
  unknownSymbols: number;
  score: number;
};

function initialValidationStats(alphabetHelper: AlphabetHelper): SequenceValidationResult {
  return { alphabetHelper, length: 0, unknownSymbols: 0, wildcards: 0, score: 0 };
}

export class AlphabetHelper {
  /** true for main symbols, false for wildcards */
  public readonly symbols: Map<string, boolean>;

  constructor(
    public readonly type: Alphabet,
    public readonly humanReadableName: string,
    mainSymbols: string,
    wildcards: string,
    private readonly lengthReward: number,
    private readonly wildcardPenalty: number,
    private readonly unknownPenalty: number
  ) {
    this.symbols = new Map();
    for (let i = 0; i < mainSymbols.length; ++i)
      this.symbols.set(mainSymbols.charAt(i).toLocaleLowerCase(), true);
    for (let i = 0; i < wildcards.length; ++i)
      this.symbols.set(wildcards.charAt(i).toLocaleLowerCase(), false);
  }

  validate(
    sequence: string,
    initialValue: SequenceValidationResult = initialValidationStats(this)
  ): SequenceValidationResult {
    if (initialValue.alphabetHelper !== this)
      throw new Error('Initial value from different alphabet helper.');
    let { length, wildcards, unknownSymbols, score } = initialValue;
    length += sequence.length;
    score += this.lengthReward * sequence.length;
    for (let i = 0; i < sequence.length; ++i) {
      const cv = this.symbols.get(sequence.charAt(i).toLocaleLowerCase());
      if (cv === false) {
        wildcards++;
        score += this.wildcardPenalty;
      } else if (cv === undefined) {
        unknownSymbols++;
        score += this.unknownPenalty;
      }
    }
    return { alphabetHelper: this, length, wildcards, unknownSymbols, score };
  }
}

const NucleotideAlphabetHelper = new AlphabetHelper(
  'nucleotide',
  'Nucleotide',
  'ACGT',
  'RYSWKMBDHVN',
  10, -20, -200
);
const AminoAcidAlphabetHelper = new AlphabetHelper(
  'amino-acid',
  'Amino Acid',
  'ACDEFGHIKLMNPQRSTVWY',
  'X',
  1, -2, -20
);

const AllAlphabetHelpers = [NucleotideAlphabetHelper, AminoAcidAlphabetHelper];

export function detectAlphabet(sequences: string[]): AlphabetHelper | undefined {
  let validationStats = AllAlphabetHelpers.map((h) => initialValidationStats(h));
  for (let ai = 0; ai < AllAlphabetHelpers.length; ++ai)
    for (const s of sequences)
      validationStats[ai] = AllAlphabetHelpers[ai].validate(s, validationStats[ai]);
  let bestAIdx = 0;
  let bestScore = validationStats[bestAIdx].score;
  for (let ai = 1; ai < AllAlphabetHelpers.length; ++ai) {
    const currentScore = validationStats[ai].score;
    if (bestScore < currentScore) {
      bestAIdx = ai;
      bestScore = currentScore;
    }
  }
  if (bestScore <= 0) return undefined;
  return AllAlphabetHelpers[bestAIdx];
}

// noinspection JSUnusedLocalSymbols
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
