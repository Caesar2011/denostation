//

import {stationServe} from "./serve.ts";
import { join, globToRegExp } from "https://deno.land/std@0.72.0/path/mod.ts";
import { walkSync } from "https://deno.land/std@0.72.0/fs/walk.ts";
import {relative, resolve} from "../utils/path.ts";
import {bundle, bundleAndMinify} from "./utils/bundle.ts";
import {mapResources} from "./resource.ts";

async function denostationCli(args: string[]): Promise<void> {
  const config = await loadConfig();
  const cwd = Deno.cwd();
  switch (args[0]) {
    case "serve":
      await stationServe(Number(args[1] || NaN) || config.port, config.outFolder);
      break;
    case "bundle":
      Deno.chdir(config.rootFolder);
      await Deno.mkdir(join(cwd, config.outFolder), {recursive: true});
      await bundleAndMinify(
        join(cwd, config.rootFolder, "bundle.ts"),
        join(cwd, config.outFolder, "bundle.js"),
        join(cwd, config.outFolder, "bundle.min.js"),
        join(cwd, config.rootFolder, config.tsConfig),
        false,
        true
      );
      Deno.chdir(cwd);
      const iterators = [walkSync(config.rootFolder, {
        match: ["html", "ico", "css"].map(ending => globToRegExp(join("**", `*.${ending}`), {
          extended: true,
          globstar: true
        }))
      })];
      iterators.push(walkSync(join(config.rootFolder, "res"), {
        match: [globToRegExp(join("**", "*.*"), {
          extended: true,
          globstar: true
        })]
      }));
      for (const iterator of iterators) {
        for (const value of iterator) {
          if (value.isFile && !value.isSymlink) {
            const newFilepath = join(Deno.cwd(), config.outFolder, relative(config.rootFolder, value.path));
            await Deno.mkdir(newFilepath.substr(0, newFilepath.length-value.name.length), {recursive: true});
            await Deno.copyFile(
              join(Deno.cwd(), value.path),
              join(newFilepath),
            );
          }
        }
      }
      break;
    case "resource":
      await mapResources(join(config.rootFolder, "res"));
      break;
    case "production":
      await denostationCli(["resource"]);
      await denostationCli(["bundle"]);
      break;
    case "debug":
      let changeCb: (() => void)|undefined;
      const doBundle = () => bundle(
        join(cwd, config.rootFolder, "bundle.ts"),
        join(cwd, config.rootFolder, "bundle.js"),
        join(cwd, config.rootFolder, config.tsConfig)
      );
      await doBundle();
      (async () => {
        let timeout: number|undefined;
        for await (const change of Deno.watchFs(config.rootFolder, {recursive: true})) {
          const containsTsFile = change.paths.some(path => path.endsWith(".ts"));
          if (containsTsFile) {
            if (timeout) {
              clearTimeout(timeout);
              timeout = undefined;
            }
            timeout = setTimeout(async () => {
              console.log("Change detected: Compiling...");
              timeout = undefined;
              await doBundle();
              if (changeCb) changeCb();
            }, 50);
          }
        }
      })().catch(err => {console.error(err); Deno.exit(1)});
      await stationServe(Number(args[1] || NaN) || config.port, config.rootFolder, cb => changeCb = cb);
      break;
  }
}

interface Config {
  port: number,
  rootFolder: string,
  outFolder: string,
  tsConfig: string
}

async function loadConfig(): Promise<Config> {
  let config: Config = {
    port: 3000,
    rootFolder: "./src",
    outFolder: "./out",
    tsConfig: "tsconfig.json"
  };
  try {
    const file = JSON.parse(await Deno.readTextFile(join(Deno.cwd(), "./denostation.json")));
    return {...config, ...file};
  } catch (e) {
    console.warn("Loading denostation.json failed!");
    return config;
  }
}

if (import.meta.main) {
  await denostationCli(Deno.args);
}
