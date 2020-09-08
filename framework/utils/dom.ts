import {betterEval} from "./misc.ts";

type ParseFunc<T = any> = (data: any) => T;
export type UpgradedNode = Node & { update(data: any): void };
type UpgradedText = Text & { update(data: any): void };
type UpgradedHTMLElement = HTMLElement & { update(data: any): void };
export type ComponentProperties = {methods: string[], getter: string[], setter: string[]};

function upgradeText(node: UpgradedText) {
  const interpolateText = interpolate(node.wholeText);
  node.update = function(data) {
    this.data = interpolateText(data);
  }
}

function upgradeHTMLElement(node: UpgradedHTMLElement) {
  const args: {[_: string]: ParseFunc} = {};
  for (let idx in node.attributes) {
    if (!node.attributes.hasOwnProperty(idx)) continue;
    const name = node.attributes[idx].nodeName;
    const value = node.attributes[idx].nodeValue ?? "";
    if (name.startsWith("[")) {
      args[name] = evaluate(value);
    } else if (name.startsWith("(")) {
      // output
    } else {
      args[name] = interpolate(value);
    }
  }
  node.update = function (data) {
    for (const key in args) {
      this.setAttribute(key, args[key](data));
    }
  }
}

export function upgradeNode(node: Node) {
  if (node instanceof Text) {
    upgradeText(node as UpgradedText);
  } else if (node instanceof HTMLElement) {
    upgradeHTMLElement(node as UpgradedHTMLElement);
  } else {
    (node as UpgradedNode).update = function(data) {}
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

function evaluate(evalText: string): ParseFunc {
  evalText = evalText.replace(/^([a-z])|[^.\sa-z]\s*([a-z])/gi, (a) => {
    const pos = a.length-1;
    return `${a.substring(0, pos)}$refObj.${a.substring(pos)}`; })
  const evalFunc = betterEval(`function($refObj) {return ${evalText}}`);

  return (data) => {
    return evalFunc(data);
  };
}
