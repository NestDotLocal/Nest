import path from "node:path"
import fs from "node:fs"

if (!fs.existsSync(path.resolve(__dirname, "nest"))) {
    fs.mkdirSync(path.resolve(__dirname, "nest"))
}

import "./server/main";
import "./db/main";
