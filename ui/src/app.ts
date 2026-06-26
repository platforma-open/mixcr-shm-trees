import { model } from "@platforma-open/milaboratories.mixcr-shm-trees.model";
import { defineAppV3 } from "@platforma-sdk/ui-vue";
import MainPage from "./pages/MainPage.vue";
import TreePage from "./pages/TreePage.vue";
import TreeTablePage from "./pages/TreeTablePage.vue";
import SOIPage from "./pages/SOIPage.vue";
import BasketPage from "./pages/BasketPage.vue";

export const sdkPlugin = defineAppV3(model, (app) => {
  return {
    progress: () => app.model.outputs.calculating,
    routes: {
      "/": () => MainPage,
      "/soi": () => SOIPage,
      "/trees": () => TreeTablePage,
      "/dendrogram": () => TreePage,
      "/basket": () => BasketPage,
    },
  };
});

export const useApp = sdkPlugin.useApp;
