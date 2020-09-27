import { exec } from "https://deno.land/x/execute@v1.1.0/mod.ts";
import { join } from "https://deno.land/std@0.70.0/path/mod.ts";
import Babel from "https://dev.jspm.io/@babel/standalone"; // @6.26.0
import minify from "https://dev.jspm.io/babel-minify";

async function addScriptToCode(code: string, script: string, idx: number) {
  let path = join(import.meta.url, script);
  path = path.substring(path.indexOf("/"));
  const regenerator = await Deno.readTextFile(path);
  return code.substring(0, idx) + "\n" + regenerator + "\n" + code.substring(idx);
}

export async function bundle(BUNDLE_IN: string, BUNDLE_OUT: string, BUNDLE_OUT_MIN?: string, IE11_ENABLED: boolean = false, log: boolean = false) {
  if (log) console.log("Bundling,");
  await exec(`deno bundle --config tsconfig.json ${BUNDLE_IN} ${BUNDLE_OUT}`);

  if (log) console.log(IE11_ENABLED ? "IE11'ify," : "Transform,");
  let code = await Deno.readTextFile(BUNDLE_OUT);
  let presets: any = [['env', {
    "modules": false,
    "targets": {
      "edge": "80",
      "firefox": "60",
      "chrome": "67",
      "safari": "11.1"
    }}]];// */
  if (IE11_ENABLED) {
    presets = [['env', {
      "modules": false,
      "targets": {
        "edge": "17",
        "firefox": "54",
        "chrome": "51",
        "safari": "10",
        "ie": "11"
      }}]];
    code = await addScriptToCode(code, "../../data/polyfill-eventtarget.js", 0);
  }
  code = Babel.transform(code, { presets }).code;
  code = await addScriptToCode(
    code,
    "../../data/regeneratorRuntime.js",
    code.indexOf("\"use strict\";") + "\"use strict\";".length
  );
  await Deno.writeTextFile(BUNDLE_OUT, code);

  if (BUNDLE_OUT_MIN) {
    if (log) console.log(`Minify,${IE11_ENABLED ? " (haha joke, still IE11 compatible)" : ""}`);
    const minified = minify(code).code;
    await Deno.writeTextFile(BUNDLE_OUT_MIN, minified);
  }

  if (log) console.log("Done.");
}
