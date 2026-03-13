import { Editor, rootCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";

Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar");
const sidebarFileTemp = sidebar?.querySelector<HTMLTemplateElement>("template.sidebarFile");
const sidebarFile = sidebarFileTemp?.content;

