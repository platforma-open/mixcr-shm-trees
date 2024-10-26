import { Branded } from '@milaboratories/helpers';
import { Ref } from '@platforma-sdk/model';

export function refsEqual(ref1: Ref, ref2: Ref): boolean {
  return ref1.blockId === ref2.blockId && ref1.name === ref2.name;
}

export type RefString = Branded<string, 'ModelRef'>;

export function toRefString(ref: Ref): RefString;
export function toRefString(ref: Ref | undefined): RefString | undefined;
export function toRefString(ref: Ref | undefined): RefString | undefined {
  return ref === undefined ? undefined : (`${ref.blockId}@@${ref.name}` as RefString);
}

export function fromRefString(ref: RefString): Ref;
export function fromRefString(ref: RefString | undefined): Ref | undefined;
export function fromRefString(ref: RefString | undefined): Ref | undefined {
  if (ref === undefined) return undefined;
  const split = ref.split('@@', 2);
  if (split.length !== 2) throw new Error('Wrong split length');
  return {
    __isRef: true,
    blockId: split[0],
    name: split[1]
  };
}
