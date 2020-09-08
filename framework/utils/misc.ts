export type Instantiable<T = any> = {new(...args: any[]): T};
export type Service<T> = Instantiable<T>;

export function walkTheDOM(node: Node, func: (node: Node) => void){
	func(node);
	let child = node.firstChild;

	while (child) {
		walkTheDOM(child, func);
		child = child.nextSibling;
	}
}

export function betterEval(code: string): any {
	const data = `"use strict";return (${code})`;
	console.log(data);
	return Function(data)();
}
