//
// (!!!) TO be moved to a common SDK helper library library
//

import { TreeNodeAccessor } from '@platforma-sdk/model';


export const ResourceMapResourceTypeName = 'PColumnData/ResourceMap';
export const ResourceMapResourcePartitionedTypeName = 'PColumnData/Partitioned/ResourceMap';

export type PColumnKey = (string | number)[];

export type PColumnResourceMapEntry<T> = {
  key: PColumnKey;
  value: T;
};

export type PColumnResourceMapData<T> = {
  isComplete: boolean;
  data: PColumnResourceMapEntry<T>[];
};

function populateResourceMapData<T>(
  acc: TreeNodeAccessor | undefined,
  resourceParser: (acc: TreeNodeAccessor) => T | undefined,
  data: PColumnResourceMapEntry<T>[],
  keyPrefix: PColumnKey = []
): boolean {
  if (acc === undefined) return false;
  switch (acc.resourceType.name) {
    case ResourceMapResourceTypeName: {
      let isComplete = acc.getInputsLocked();
      for (const keyStr of acc.listInputFields()) {
        const value = acc.resolve({ field: keyStr, assertFieldType: 'Input' });
        if (value === undefined) isComplete = false;
        else {
          const key = [...keyPrefix, ...JSON.parse(keyStr)] as PColumnKey;
          const converted = resourceParser(value);
          if (converted === undefined) isComplete = false;
          else data.push({ key, value: converted });
        }
      }
      return isComplete;
    }
    case ResourceMapResourcePartitionedTypeName: {
      let isComplete = acc.getInputsLocked();
      for (const keyStr of acc.listInputFields()) {
        const value = acc.resolve({ field: keyStr, assertFieldType: 'Input' });
        if (value === undefined) isComplete = false;
        else {
          const key = [...keyPrefix, ...JSON.parse(keyStr)] as PColumnKey;
          isComplete = isComplete && populateResourceMapData(value, resourceParser, data, key);
        }
      }
      return isComplete;
    }
    default:
      throw new Error(`Unknown resource type: ${acc.resourceType.name}`);
  }
}

export function parseResourceMap<T>(
  acc: TreeNodeAccessor | undefined,
  resourceParser: (acc: TreeNodeAccessor) => T | undefined
): PColumnResourceMapData<NonNullable<T>> {
  const data: PColumnResourceMapEntry<NonNullable<T>>[] = [];
  const isComplete = populateResourceMapData(acc, resourceParser, data, []);
  return { isComplete, data };
}
