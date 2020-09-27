import {betterEval} from "./misc.ts";
import {BaseComponent, HTMLDataElement} from "../component.ts";
import {framework} from "../mod.ts";
import {BaseDirective, DirectiveClass} from '../directive.ts';

type ParseFunc<T = any> = (data: any) => Promise<T>|T;
export type NodeUpgrade = {
  updateAttributes(data: any, forceAnyUpdate: boolean): Promise<void>;
}
export type UpgradedNode = Node & NodeUpgrade;
type UpgradedText = Text & NodeUpgrade;
type UpgradedHTMLElement = HTMLElement & NodeUpgrade;
export type ComponentProperties = {methods: string[], getter: string[], setter: string[]};

function upgradeText(node: Text) {
  const interpolateText = interpolate(node.wholeText);
  (node as UpgradedText).updateAttributes = async function(data: any) {
    this.data = await interpolateText(data);
  }
}

type InOutput = "input"|"output";
type AddDirectivesOptions = { [_ in InOutput]?: boolean } & {
  directiveCache: Map<DirectiveClass, BaseDirective>,
  directives: { [_ in InOutput]: { [p: string]: BaseDirective[] } },
  node: HTMLElement
};
function addDirectives(namePart: string, opts: AddDirectivesOptions): boolean {
  let found = false;
  for (const type of ["input", "output"] as InOutput[]) {
    if (opts[type]) {
      const dirs = framework.directive(namePart, type === "input");
      if (dirs.length) {
        found = true;
        opts.directives[type][namePart] = dirs
          .map(dir =>
            opts.directiveCache.get(dir)
            || opts.directiveCache.set(dir, new dir(opts.node)).get(dir) as BaseDirective
          );
      }
    }
  }
  return found;
}

function upgradeHTMLElement(node: HTMLElement) {
  const inputHtmlArgs: {[_: string]: ParseFunc} = {};
  const inputArgs: {[_: string]: ParseFunc} = {};
  const outputHtmlArgs: {[_: string]: ParseFunc} = {};
  const outputArgs: {[_: string]: ParseFunc} = {};

  const directives: {[_ in InOutput]: {[name: string]: BaseDirective[]}} = {input: {}, output: {}};
  const directiveCache = new Map<DirectiveClass, BaseDirective>();

  const hasComponent = isHTMLDataElement(node);
  let hasDirective = false;
  const beforeValues = new Map<PropertyKey, any>();

  for (const idx in node.attributes) {
    if (!node.attributes.hasOwnProperty(idx)) continue;
    const name = node.attributes[idx].nodeName;
    const value = node.attributes[idx].nodeValue || "";
    if (name.startsWith("[(")) { // two-way binding
      const namePart = name.substring(2, name.length-2);
      const nameIsDirective = addDirectives(namePart, {directives, directiveCache, node, input: true, output: true});
      hasDirective = hasDirective || nameIsDirective;
      if (hasComponent || nameIsDirective) {
        inputArgs[namePart] = evaluate(value);
        outputArgs[namePart] = evaluate(value, true);
      }
    } else if (name.startsWith("[")) { // input
      const namePart = name.substring(1, name.length-1);
      const nameIsDirective = addDirectives(namePart, {directives, directiveCache, node, input: true});
      hasDirective = hasDirective || nameIsDirective;
      if (hasComponent || nameIsDirective) {
        inputArgs[namePart] = evaluate(value);
      }
    } else if (name.startsWith("(")) { // output
      const namePart = name.substring(1, name.length-1);
      const nameIsDirective = addDirectives(namePart, {directives, directiveCache, node, output: true});
      hasDirective = hasDirective || nameIsDirective;
      if (hasComponent || nameIsDirective) {
        outputArgs[namePart] = evaluate(value, true);
      }
    } else if (name.startsWith("on")) { // html element events
      outputHtmlArgs[name] = evaluate(value, true);
    } else { // html element attributes
      inputHtmlArgs[name] = interpolate(value);
    }
  }
  (node as UpgradedHTMLElement).updateAttributes = async function (data: any, forceAnyUpdate: boolean) {
    for (const key in inputHtmlArgs) {
      this.setAttribute(key, await inputHtmlArgs[key](data));
    }
    for (const key in outputHtmlArgs) {
      (this as any)[key] = outputHtmlArgs[key](data);
    }
    if (hasComponent || hasDirective) {
      for (const key in inputArgs) {
        const before = beforeValues.get(key);
        const after = await inputArgs[key](data);
        if (before !== after) {
          beforeValues.set(key, after);
          const emitC = hasComponent ? !(this as any as HTMLDataElement).collectInputChange(key, after) : true;
          const emitD = !(directives.input[key] || []).map(dir => dir.collectInputChange(key, after)).some(x => x);
          if (emitC && emitD) {
            console.error(`The component '${this.tagName}' does not export '${key}' as input.`);
          }
        }
      }
      for (const key in outputArgs) {
        const outputFunc = (evt: any) => {
          outputArgs[key](data)(evt);
          ((this.getRootNode() as ShadowRoot).host as HTMLDataElement).updateDOM();
        };
        const emitC = hasComponent ? !(this as any as HTMLDataElement).collectOutputChange(key, outputFunc) : false;
        const emitD = !(directives.output[key] || []).map(dir => dir.collectOutputChange(key, outputFunc)).some(x => x);
        if (emitC && emitD) {
          console.error(`The component '${this.tagName}' does not export '${key}' as output.`);
        }
      }
      if (hasComponent) {
        (this as any as HTMLDataElement).notifyInputChanged();
        if (forceAnyUpdate) {
          (this as any as HTMLDataElement).updateDOM(forceAnyUpdate);
        }
      }
      directiveCache.forEach((value, key) => value.notifyInputChanged());
    }
  }
}

export function upgradeNode(node: Node) {
  if (node instanceof Text) {
    upgradeText(node as UpgradedText);
  } else if (node instanceof HTMLElement) {
    upgradeHTMLElement(node as UpgradedHTMLElement);
  } else {
    (node as UpgradedNode).updateAttributes = async function() {}
  }
}

function interpolate(text: string): ParseFunc<string> {
  const collect: ParseFunc[] = [];
  while (true) {
    const idxStart = text.search(`{{`);
    if (idxStart >= 0) {
      const staticText = text.substring(0, idxStart);
      collect.push(() => staticText);
      text = text.substring(idxStart+2);
      const idxEnd = text.search(`}}`);
      if (idxEnd >= 0) {
        const evalText = text.substring(0, idxEnd);
        collect.push(evaluate(evalText));
        text = text.substring(idxEnd+2);
      }
    } else break;
  }
  if (text.length > 0) {
    collect.push(() => text);
  }

  return async (data): Promise<string> => {
    const awaited: string[] = await Promise.all(
      collect.map(async func => {
        return String(await func(data) || "");
      }));
    return awaited.join("");
  };
}

function evaluate(evalText: string, isOutput: boolean = false, inPipe: boolean = false): ParseFunc {
  if (isOutput || inPipe) return evaluatePart(evalText, isOutput);

  // extract pipes
  const split: string[] = [];
  let concat = false;
  evalText.split("|").forEach(val => {
    if (val === "") concat = true;
    else if (concat) split[split.length - 1] += `|${val}`;
    else split.push(val);
  });
  const parts: ParseFunc[] = split.map((str, idx) => {
    return idx === 0 ? evaluatePart(str) : evaluatePipe(str.trim());
  });

  return async (data: any) => {
    for (const part of parts) {
      data = await part(data);
    }
    return data;
  };
}

function evaluatePart(evalText: string, isOutput: boolean = false): ParseFunc {
  if (isOutput) {
    // if property in output, assign $evt to it ("property.value" -> "property.value = $evt")
    const regexProp = /^[ \t]*[a-zA-Z_$][a-zA-Z0-9_$]*[ \t]*(\.[ \t]*[a-zA-Z_$][a-zA-Z0-9_$]*[ \t]*)*$/g;
    const isPropertyOnly = regexProp.test(evalText);
    if (isPropertyOnly) {
      evalText += ' = $evt';
    }
    // make result callable and pass $evt as event data
    evalText = `function($evt) {return ${evalText}}`;
  }
  const evalFunc = betterEval(`function($refObj) {with ($refObj) {return ${evalText}}}`, false);

  return (data) => {
    return evalFunc(data);
  };
}

function evaluatePipe(evalText: string): ParseFunc {
  const split: string[] = [];
  let concat = false;
  evalText.split(":").forEach(val => {
    if (val.endsWith("\\")) {
      split.push(val.substring(0, val.length-1));
      concat = true;
    }
    else if (concat) split[split.length - 1] += `:${val}`;
    else split.push(val);
  });
  const pipeConstructor = framework.pipes[split[0]];
  if (!pipeConstructor) {
    console.warn(`The pipe '${split[0]}' is not registered!`);
    return data => data;
  } else {
    const pipe = new pipeConstructor();
    const args = split.slice(1).map(arg => evaluate(arg, false, true));
    return async (data: any) => pipe.transform(data, await Promise.all(args.map(arg => arg(data))));
  }
}

export function isHTMLDataElement(node: Node): node is HTMLDataElement {
  return node.hasOwnProperty("data") && (node as any).data instanceof BaseComponent;
}

export function walkTheDOM(node: Node, func: (node: Node) => void) {
  func(node);
  let child = node.firstChild;

  while (child) {
    walkTheDOM(child, func);
    child = child.nextSibling;
  }
}
