import {globToRegExp, join, relative} from 'https://deno.land/std@0.72.0/path/mod.ts';
import {walkSync} from 'https://deno.land/std@0.72.0/fs/walk.ts';
import {
  CONSTRAINT_REGEX,
  Constraints,
  EntityPaths,
  RESOURCE_VERSION,
  ResourceFile,
  ResourceFolder
} from "../utils/resource-mapping.ts";
import {iterateEnum} from "../utils/misc.ts";

export async function mapResources(resFolder: string) {
  const iterator = walkSync(resFolder, {
    match: [globToRegExp(join("**", "*.*"), {
      extended: true,
      globstar: true
    })]
  });

  const regexValues = /[\\/](values|drawables|styles)[\\/]([^\\/]+)\.([a-z]{1,10})$/;
  const resources: ResourceFile = {version: RESOURCE_VERSION, drawables: {}, values: {}, styles: {}};

  for (const value of iterator) {
    if (value.isFile && !value.isSymlink) {
      const match = value.path.match(regexValues);
      if (!match) continue;
      const path = (match[2] || "").split("-").filter(x => !!x);
      if (path.length === 0) continue;
      path[0] = `${path[0]}.${match[3] || ""}`;
      addResource(resources[match[1] as ResourceFolder], resFolder, path, value.path.replaceAll("\\", "/"));
    }
  }

  await Deno.writeTextFile(join(resFolder, "list.json"), JSON.stringify(resources));
  //console.log(JSON.stringify(resources, null, "  "));
}

function classifyType(next: string): Constraints|undefined {
  for (const item of iterateEnum(Constraints)) {
    if (next.match(CONSTRAINT_REGEX[item as Constraints])) return item;
  }
  return undefined;
}

function addResource(obj: {[name: string]: EntityPaths}, resFolder: string, path: string[], uri: string) {
  const next = path.shift();
  if (next === undefined) return;
  if (!obj.hasOwnProperty(next)) {
    obj[next] = {};
  }
  if (path.length === 0) {
    obj[next].defPath = relative(resFolder, uri);
  } else {
    const nextConstraintType = classifyType(path[0]);
    const currConstraintType = obj[next].nextConstraint ? Number(obj[next].nextConstraint) : -1;
    if (currConstraintType === -1) {
      obj[next].nextConstraint = String(nextConstraintType);
      obj[next].subPaths = {};
    } else if (nextConstraintType === undefined) {
      console.warn(`Ignoring resource with unknown constraint '${path[0]}:'`, uri);
    } else if (currConstraintType < nextConstraintType) {
      // next one is less important -> any branch
      path.unshift("*");
    } else if (currConstraintType === nextConstraintType) {
      // next one is equal -> do nothing, just go forward
    } else {
      // next one is more important -> move current else to any branch
      obj[next] = {
        nextConstraint: String(nextConstraintType),
        subPaths: {"*": obj[next]}
      }
    }
    addResource(obj[next].subPaths!, resFolder, path, uri);
  }
}

