import {
  getAxisId,
  PColumnSpec,
  PTableRecordFilter,
  PValue,
  PValueJsonSafe,
  pValueToStringOrNumber
} from '@platforma-sdk/model';

export type FullTreeId = {
  donorId: PValueJsonSafe;
  treeId: number;
  subtreeId: string | undefined;
};

export function treeNodesFilter(
  anchorColumnSpec: PColumnSpec,
  fullTreeId: FullTreeId
): PTableRecordFilter[] {
  const donorAxis = anchorColumnSpec.axesSpec[0];
  const treeAxis = anchorColumnSpec.axesSpec[1];
  if (treeAxis.name !== 'pl7.app/dendrogram/treeId')
    throw new Error(`Unexpected second axis name: ${treeAxis.name}`);
  const filters: PTableRecordFilter[] = [
    {
      type: 'bySingleColumnV2',
      column: {
        type: 'axis',
        id: getAxisId(anchorColumnSpec.axesSpec[0])
      },
      predicate: {
        operator: 'Equal',
        reference: pValueToStringOrNumber(fullTreeId.donorId)
      }
    },
    {
      type: 'bySingleColumnV2',
      column: {
        type: 'axis',
        id: getAxisId(anchorColumnSpec.axesSpec[1])
      },
      predicate: {
        operator: 'Equal',
        reference: fullTreeId.treeId
      }
    }
  ];
  if (fullTreeId.subtreeId !== undefined && anchorColumnSpec.axesSpec.length > 2) {
    const subtreeAxisSpec = anchorColumnSpec.axesSpec[2];
    if (subtreeAxisSpec.name !== 'pl7.app/dendrogram/subtreeId')
      throw new Error(`Unexpected third axis name: ${subtreeAxisSpec.name}`);

    filters.push({
      type: 'bySingleColumnV2',
      column: {
        type: 'axis',
        id: getAxisId(anchorColumnSpec.axesSpec[2])
      },
      predicate: {
        operator: 'Equal',
        reference: fullTreeId.subtreeId
      }
    });
  }

  // const cloneIdAxis = anchorColumnSpec.axesSpec.find((a) => a.name === 'pl7.app/vdj/cloneId');
  // if (!cloneIdAxis) throw new Error('No clone id axis');

  filters.push({
    type: 'bySingleColumnV2',
    column: {
      type: 'axis',
      id: {
        name: 'pl7.app/vdj/cloneId',
        type: 'Long'
      }
    },
    predicate: {
      operator: 'Not',
      operand: {
        operator: 'IsNA'
      }
    }
  });

  return filters;
}
