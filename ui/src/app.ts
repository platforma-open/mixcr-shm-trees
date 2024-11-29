import { model } from '@platforma-open/milaboratories.mixcr-shm-trees.model';
import { defineApp } from '@platforma-sdk/ui-vue';
import MainPage from './pages/MainPage.vue';
import TreeGraphPage from './pages/TreeGraphPage.vue';
import TreeNodesTablePage from './pages/TreeNodesTablePage.vue';
import TreeTablePage from './pages/TreeTablePage.vue';

export const sdkPlugin = defineApp(
  model,
  () => {
    return {
      routes: {
        '/': () => MainPage,
        '/trees': () => TreeTablePage,
        '/treeNodes': () => TreeNodesTablePage,
        '/graph': () => TreeGraphPage
      }
    };
  }
);

export const useApp = sdkPlugin.useApp;
