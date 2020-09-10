import {betterEval} from "./misc.ts";
import {BaseComponent, HTMLDataElement} from "../component.ts";

type ParseFunc<T = any> = (data: any) => T;
export type NodeUpgrade = {
  updateAttributes(data: any): void
}
export type UpgradedNode = Node & NodeUpgrade;
type UpgradedText = Text & NodeUpgrade;
type UpgradedHTMLElement = HTMLElement & NodeUpgrade;
export type ComponentProperties = {methods: string[], getter: string[], setter: string[]};

function upgradeText(node: UpgradedText) {
  const interpolateText = interpolate(node.wholeText);
  node.updateAttributes = function(data) {
    this.data = interpolateText(data);
  }
}

function upgradeHTMLElement(node: UpgradedHTMLElement) {
  const inputHtmlArgs: {[_: string]: ParseFunc} = {};
  const inputArgs: {[_: string]: ParseFunc} = {};
  const outputHtmlArgs: {[_: string]: ParseFunc} = {};
  const outputArgs: {[_: string]: ParseFunc} = {};

  const hasComponent = node.hasOwnProperty("data") && (node as any).data instanceof BaseComponent;
  const beforeValues = new Map<PropertyKey, any>();

  for (let idx in node.attributes) {
    if (!node.attributes.hasOwnProperty(idx)) continue;
    let name = node.attributes[idx].nodeName;
    const value = node.attributes[idx].nodeValue ?? "";
    if (name.startsWith("[(")) { // two-way binding
      if (hasComponent) {
        name = name.substring(2, name.length-2);
        inputArgs[name] = evaluate(value);
        outputArgs[name] = evaluate(value, true);
      }
    } else if (name.startsWith("[")) { // input
      if (hasComponent) {
        name = name.substring(1, name.length-1);
        inputArgs[name] = evaluate(value);
      }
    } else if (name.startsWith("(")) { // output
      if (hasComponent) {
        name = name.substring(1, name.length-1);
        outputArgs[name] = evaluate(value, true);
      }
    } else if (name.startsWith("on")) { // html element events
      outputHtmlArgs[name] = evaluate(value, true);
    } else { // html element attributes
      inputHtmlArgs[name] = interpolate(value);
    }
  }
  (node as any as UpgradedHTMLElement & HTMLDataElement<any>).updateAttributes = function (data) {
    for (const key in inputHtmlArgs) {
      this.setAttribute(key, inputHtmlArgs[key](data));
    }
    for (const key in outputHtmlArgs) {
      (this as any)[key] = outputHtmlArgs[key](data);
    }
    if (hasComponent) {
      for (const key in inputArgs) {
        const before = beforeValues.get(key);
        const after = inputArgs[key](data);
        if (before !== after) {
          beforeValues.set(key, after);
          this.collectInputChange(key, after);
        }
      }
      for (const key in outputArgs) {
        this.collectOutputChange(key, outputArgs[key](data));
      }
      this.notifyInputChanged();
    }
  }
}

export function upgradeNode(node: Node) {
  if (node instanceof Text) {
    upgradeText(node as UpgradedText);
  } else if (node instanceof HTMLElement) {
    upgradeHTMLElement(node as UpgradedHTMLElement);
  } else {
    (node as UpgradedNode).updateAttributes = function(data) {}
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

  return (data) => {
    return collect
      .map(func => {
        return (func(data) ?? "").toString();
      })
      .join("");
  };
}

function evaluate(evalText: string, isOutput: boolean = false): ParseFunc {
  // match all variable names starting with [a-zA-Z_$] (case-sensitive) except of $evt
  const regex = /(^[ \t]*[a-zA-Z_$])|([^.\sa-zA-Z0-9_$][ \t]*[a-zA-Z_])|([^.\sa-zA-Z0-9_$][ \t]*\$(?!evt))/g;
  evalText = evalText.replace(regex, (a) => {
    const pos = a.length-1;
    return `${a.substring(0, pos)}$refObj.${a.substring(pos)}`;
  });
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
  const evalFunc = betterEval(`function($refObj) {return ${evalText}}`);

  return (data) => {
    return evalFunc(data);
  };
}
