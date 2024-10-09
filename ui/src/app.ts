import { platforma } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './MainPage.vue';
import TreeTablePage from './TreeTablePage.vue';
import TreeNodesTablePage from './TreeNodesTablePage.vue';

export const sdkPlugin = defineApp(platforma, () => {
  return {
    routes: {
      '/': MainPage,
      '/trees': TreeTablePage,
      '/treeNodes': TreeNodesTablePage
    }
  };
});

export const useApp = sdkPlugin.useApp;
