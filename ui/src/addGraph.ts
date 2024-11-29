import { GraphMakerSettings } from '@milaboratories/graph-maker';
import { useApp } from './app';

const nextId = () => {
  const app = useApp();

  if (app.model.ui.graphs.length > 0) {
    return String(Math.max(...app.model.ui.graphs.map((g) => Number(g.id))) + 1);
  }
  return '1';
};

export const addGraph = async (
  label: string,
  donorId: string,
  treeId: number,
  vGene: string,
  jGene: string
) => {
  const app = useApp();

  if (!app.model.outputs.treeColumnSpec) {
    return;
  }

  const graph: GraphMakerSettings = {
    title: label,
    chartType: 'dendro',
    template: 'dendro',

    fixedOptions: [
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
    ]
  };
  const id = nextId();

  await app.updateUiState((ui) => {
    ui.graphs = [...(ui.graphs ?? []), { id, settings: graph }];
    return ui;
  });

  await app.navigateTo(`/graph?id=${id}`);
};
