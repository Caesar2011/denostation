import {bundleAndMinify} from "./utils/bundle.ts";

await bundleAndMinify(
  "webpage/bundle.ts",
  "webpage/bundle.js",
  "webpage/bundle.min.js",
  "tsconfig.json"
);
