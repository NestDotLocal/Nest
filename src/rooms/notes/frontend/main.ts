import { Editor, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import "@milkdown/kit/prose/view/style/prosemirror.css";

await Editor.make()
    .config((ctx) => {
        ctx.set(rootCtx, document.getElementById("editor"));
    })
    .use(commonmark)
    .create();

const sidebar = document.getElementById("sidebar");
const sidebarFileTemp = sidebar?.querySelector<HTMLTemplateElement>("template.sidebarFile");
const sidebarFile = sidebarFileTemp?.content;
