import {bundle} from "./utils/bundle.ts";

await bundle(
  "webpage/bundle.ts",
  "webpage/bundle.js",
  "webpage/bundle.min.js"
);
