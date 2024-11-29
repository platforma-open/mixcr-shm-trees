import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import DendrogramPage from './pages/DendrogramPage.vue';
import TreeNodesTablePage from './pages/TreeNodesTablePage.vue';
import TreeTablePage from './pages/TreeTablePage.vue';

export const sdkPlugin = defineApp(model, () => {
  return {
    routes: {
      '/': () => MainPage,
      '/trees': () => TreeTablePage,
      // '/treeNodes': () => TreeNodesTablePage,
      '/dendrogram': () => DendrogramPage
    }
  };
});

export const useApp = sdkPlugin.useApp;
