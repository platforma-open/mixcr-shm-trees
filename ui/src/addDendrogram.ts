import { DendrogramState } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { useApp } from './app';

const nextId = () => {
  const app = useApp();

  if (app.model.ui.dendrograms.length > 0) {
    return String(Math.max(...app.model.ui.dendrograms.map((g) => Number(g.id))) + 1);
  }
  return '1';
};

export async function addDendrogram(
  label: string,
  donorId: string,
  treeId: number,
  subtreeId: string | undefined,
  vGene: string,
  jGene: string
): Promise<DendrogramState | undefined> {
  const app = useApp();

  if (!app.model.outputs.treeColumnSpec) {
    return undefined;
  }

  const dendro: DendrogramState = {
    id: nextId(),
    donorId,
    treeId,
    subtreeId,
    state: {
      title: label,
      template: 'dendro'
    },
    fixedOps: [
      {
        inputName: 'filters',
        selectedSource: {
          type: 'axis',
          id: app.model.outputs.treeColumnSpec.axesSpec[0]
        },
        selectedFilterValue: donorId
      },
      {
        inputName: 'filters',
        selectedSource: {
          type: 'axis',
          id: app.model.outputs.treeColumnSpec.axesSpec[1]
        },
        selectedFilterValue: treeId
      }
    ],
    defaultOps: [
      {
        inputName: 'value',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/dendrogram/topology',
          valueType: 'Long',
          axesSpec: []
        }
      },
      {
        inputName: 'height',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/dendrogram/distance',
          valueType: 'Double',
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/vdj/sequence',
          valueType: 'String',
          annotations: {
            'pl7.app/label': 'CDR1 aa'
          },
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/vdj/sequence',
          valueType: 'String',
          annotations: {
            'pl7.app/label': 'CDR2 aa'
          },
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/vdj/sequence',
          valueType: 'String',
          annotations: {
            'pl7.app/label': 'CDR3 aa'
          },
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/vdj/sequence',
          valueType: 'String',
          annotations: {
            'pl7.app/label': 'Clonal sequences'
          },
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/dendrogram/isObserved',
          valueType: 'String',
          axesSpec: []
        }
      },
      {
        inputName: 'tableContent',
        selectedSource: {
          kind: 'PColumn',
          name: 'pl7.app/vdj/mutationsRate',
          valueType: 'Double',
          axesSpec: []
        }
      }
    ]
  };

  await app.updateUiState((ui) => {
    ui.dendrograms = [...(ui.dendrograms ?? []), dendro];
    return ui;
  });

  await app.navigateTo(`/dendrogram?id=${dendro.id}`);
}
