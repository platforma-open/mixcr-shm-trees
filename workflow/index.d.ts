declare type TemplateFromFile = { readonly type: "from-file"; readonly path: string; };
declare type TplName = "reconstruct-shm-trees" | "main";
declare const Templates: Record<TplName, TemplateFromFile>;
export { Templates };
