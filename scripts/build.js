import { build } from "esbuild"
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { dependencies, peerDependencies } = require("../package.json");

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies || {})),
}

build({
  ...shared,
  outfile: 'dist/index.js',
  format: 'esm',
})
