import { Branded } from '@milaboratories/helpers';
import { isPTableAbsent, PlRef, PTableValue } from '@platforma-sdk/model';

export type RefString = Branded<string, 'ModelRef'>;

export function toRefString(ref: PlRef): RefString;
export function toRefString(ref: PlRef | undefined): RefString | undefined;
export function toRefString(ref: PlRef | undefined): RefString | undefined {
  return ref === undefined ? undefined : (`${ref.blockId}@@${ref.name}` as RefString);
}

export function fromRefString(ref: RefString): PlRef;
export function fromRefString(ref: RefString | undefined): PlRef | undefined;
export function fromRefString(ref: RefString | undefined): PlRef | undefined {
  if (ref === undefined) return undefined;
  const split = ref.split('@@', 2);
  if (split.length !== 2) throw new Error('Wrong split length');
  return {
    __isRef: true,
    blockId: split[0],
    name: split[1]
  };
}

export function inferNewName(
  existingNames: string[],
  nameConstructor: (i: number) => string,
  initialValue?: string
) {
  const names = new Set(existingNames);
  let i = 1;
  let name = initialValue;
  while (name === undefined || names.has(name)) {
    name = nameConstructor(i);
    i++;
  }
  return name;
}

// @TODO transfer to SDK
export function ensureSimpleValue(v: PTableValue): string | number {
  if (isPTableAbsent(v) || v === null) throw new Error(`Unexpected value: ${v}`);
  return v;
}
export function ensureNumber(v: PTableValue): number {
  if (isPTableAbsent(v) || v === null || typeof v === 'string')
    throw new Error(`Unexpected value type: ${typeof v}`);
  return v;
}
export function ensureString(v: PTableValue): string {
  if (isPTableAbsent(v) || v === null || typeof v === 'number')
    throw new Error(`Unexpected value type: ${typeof v}`);
  return v;
}

