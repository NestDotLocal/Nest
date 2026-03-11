import { Editor, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';

Editor.make()
    .config(ctx => {
        ctx.set(rootCtx, document.getElementById('editor'));
    })
    .use(commonmark)
    .create();