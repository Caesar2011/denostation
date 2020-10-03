import {bundleAndTransform} from "./utils/bundle.ts";

await bundleAndTransform(
  "webpage/bundle.ts",
  "webpage/bundle.js",
  "webpage/bundle.min.js",
  "tsconfig.json"
);
