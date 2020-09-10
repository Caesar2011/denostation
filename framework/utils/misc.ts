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
	return Function(data)();
}

/*export type BetterTarget = EventTarget & {
	removeEventListeners(targetType: string): void
};
type EventList = { [_: string]: EventListener[] };

// thanks to Martin: https://stackoverflow.com/questions/19469881/remove-all-event-listeners-of-specific-type
export function upgradeEventTargetPrototype() {
	const target = (EventTarget as Instantiable<BetterTarget>).prototype;
	const func = target.addEventListener;
	const symListeners = Symbol('listeners');

	function listenersFrom(instance: BetterTarget & {[symListeners]: EventList}): EventList {
		if (instance[symListeners] === undefined)
			instance[symListeners] = {};
		return instance[symListeners];
	}

	target.addEventListener = function (targetType: string, listener: EventListener) {
		let listeners = listenersFrom(this);
		if (!listeners.hasOwnProperty(targetType)) {
			listeners[targetType] = [];
		}
		listeners[targetType].push(listener);
		func.apply(this, [targetType, listener]);
	};

	target.removeEventListeners = function (targetType: string) {
		let listeners = listenersFrom(this);
		if (listeners.hasOwnProperty(targetType)) {
			listeners[targetType].forEach(listener => {
				this.removeEventListener(targetType, listener);
			});
		}
	};
}*/
