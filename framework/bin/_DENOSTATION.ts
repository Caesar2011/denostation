//

import {stationServe} from "./serve.ts";
import { join, globToRegExp } from "https://deno.land/std@0.72.0/path/mod.ts";
import { walkSync } from "https://deno.land/std@0.72.0/fs/walk.ts";
import {relative, resolve} from "https://deno.land/std@0.72.0/path/mod.ts";
import {bundle, bundleAndTransform} from "./utils/bundle.ts";
import {mapResources} from "./resource.ts";

class DenostationCli {
  private readonly cwd: string = Deno.cwd();

  constructor(private readonly config: Config) { }

  async run(args: string[]) {
    switch (args[0]) {
      case "serve":
        await this.serve(args[1], this.config.outFolder);
        break;
      case "compile":
        await this.compile();
        break;
      case "resources":
        await this.mapResources();
        break;
      case "production":
        await this.compile();
        await this.mapResources();
        break;
      case "debug":
        await this.debug(args[1]);
        break;
    }
  }

  async serve(port: string|undefined, baseDir: string) {
    return stationServe(Number(port || NaN) || this.config.port, baseDir);
  }

  async copyData(srcDir: string, outDir: string) {
    const iterators = [walkSync(srcDir, {
      match: ["html", "ico", "css"].map(ending => globToRegExp(join("**", `*.${ending}`), {
        extended: true,
        globstar: true
      }))
    })];
    iterators.push(walkSync(join(srcDir, "res"), {
      match: [globToRegExp(join("**", "*.*"), {
        extended: true,
        globstar: true
      })]
    }));
    for (const iterator of iterators) {
      for (const value of iterator) {
        if (value.isFile && !value.isSymlink) {
          const newFilepath = join(Deno.cwd(), outDir, relative(srcDir, value.path));
          await Deno.mkdir(newFilepath.substr(0, newFilepath.length-value.name.length), {recursive: true});
          await Deno.copyFile(
            join(this.cwd, value.path),
            join(newFilepath),
          );
        }
      }
    }
  }

  async compile() {
    await Deno.mkdir(join(this.cwd, this.config.outFolder), {recursive: true});
    await bundleAndTransform(
      join(this.cwd, this.config.rootFolder, "bundle.ts"),
      join(this.cwd, this.config.outFolder, "bundle.js"),
      join(this.cwd, this.config.outFolder, "bundle.min.js"),
      join(this.cwd, this.config.rootFolder, this.config.tsConfig),
      true
    );
    await this.copyData(this.config.rootFolder, this.config.outFolder);
  }

  async debug(port: string|undefined) {
    const opts: {changeCb?: (() => void)} = {};
    const doBundle = () => bundle(
      join(this.cwd, this.config.rootFolder, "bundle.ts"),
      join(this.cwd, this.config.rootFolder, "bundle.js"),
      join(this.cwd, this.config.rootFolder, this.config.tsConfig)
    );
    await doBundle();
    this.changeDetector(doBundle, opts)
      .catch(err => {console.error(err); Deno.exit(1)});
    await stationServe(
      Number(port || NaN) || this.config.port,
      this.config.rootFolder,
      cb => opts.changeCb = cb
    );
  }

  async changeDetector(doBundle: () => Promise<string>, opts: {changeCb?: () => void}) {
    let detectors: {
      timeout?: number|undefined,
      detector: (change: Deno.FsEvent) => boolean,
      handler: () => Promise<unknown>
    }[] = [{
      detector: change => change.paths.some(path => path.endsWith(".ts")),
      handler: () => {
        console.log("Change detected: Compiling files...");
        return doBundle();
      }
    }, {
      detector: change => change.paths.some(path => path.startsWith(resolve(Deno.cwd(), this.config.rootFolder, "res"))),
      handler: () => {
        console.log("Change detected: Compiling resources...");
        return this.mapResources();
      }
    }];
    for await (const change of Deno.watchFs(this.config.rootFolder, {recursive: true})) {
      for (const detector of detectors) {
        if (!detector.detector(change)) continue;
        if (detector.timeout) clearTimeout(detector.timeout);
        detector.timeout = setTimeout(async () => {
          detector.timeout = undefined;
          await detector.handler();
          if (opts.changeCb) opts.changeCb();
        }, 50);
      }
    }
  }

  async mapResources() {
    await mapResources(join(this.config.rootFolder, "res"));
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
  const cli = new DenostationCli(await loadConfig());
  await cli.run(Deno.args);
}
