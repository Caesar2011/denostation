import { exec } from "https://deno.land/x/execute@v1.1.0/mod.ts";
import { join } from "https://deno.land/std@0.72.0/path/mod.ts";
import Babel from "https://dev.jspm.io/@babel/standalone"; // @6.26.0
import minify from "https://dev.jspm.io/babel-minify";

async function addScriptToCode(code: string, script: string, idx: number) {
  let path = join(import.meta.url, script);
  path = path.substring(path.indexOf("/"));
  const regenerator = await Deno.readTextFile(path);
  return code.substring(0, idx) + "\n" + regenerator + "\n" + code.substring(idx);
}

export function bundle(bundleIn: string, bundleOut: string, tsConfig?: string): Promise<string> {
  return exec(`deno bundle${tsConfig ? ` --config ${tsConfig}` : " "} ${bundleIn} ${bundleOut}`);
}

export async function bundleAndMinify(bundleIn: string, bundleOut: string, bundleOutMin?: string, tsConfig?: string, ie11Enabled: boolean = false, log: boolean = false) {
  if (log) console.log("Bundling,");
  await bundle(bundleIn, bundleOut, tsConfig);

  if (log) console.log(ie11Enabled ? "IE11'ify," : "Transform,");
  let code = await Deno.readTextFile(bundleOut);
  let presets: any = [['env', {
    "modules": false,
    "targets": {
      "edge": "80",
      "firefox": "60",
      "chrome": "67",
      "safari": "11.1"
    }}]];// */
  if (ie11Enabled) {
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
  code = (Babel as any).transform(code, { presets }).code;
  code = await addScriptToCode(
    code,
    "../../data/regeneratorRuntime.js",
    code.indexOf("\"use strict\";") + "\"use strict\";".length
  );
  await Deno.writeTextFile(bundleOut, code);

  if (bundleOutMin) {
    if (log) console.log(`Minify,${ie11Enabled ? " (haha joke, still IE11 compatible)" : ""}`);
    const minified = (minify as any)(code).code;
    await Deno.writeTextFile(bundleOutMin, minified);
  }

  if (log) console.log("Done.");
}
