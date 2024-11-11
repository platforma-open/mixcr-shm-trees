import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import TreeTablePage from './TreeTablePage.vue';
import TreeNodesTablePage from './TreeNodesVisualizationPage.vue';
import MainPageWrapper from './MainPageWrapper.vue';

export const sdkPlugin = defineApp(platforma, (): any => {
  return {
    routes: {
      '/': MainPageWrapper,
      '/trees': TreeTablePage,
      '/treeNodes': TreeNodesTablePage
    }
  };
});

export const useApp = sdkPlugin.useApp;
