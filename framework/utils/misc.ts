export type Instantiable<T = any> = {new(...args: any[]): T};

export function betterEval(code: string): any {
	const data = `"use strict";return (${code})`;
	return Function(data)();
}

export function hasOwnProperty<T extends object, K extends keyof T>(object: T, key: string|number|symbol): key is K {
	return object.hasOwnProperty(key);
}

export function* iterateEnum(x: any): Generator<number> {
	for (let item in x) {
		const num = Number(item);
		if (isNaN(num)) continue;
		yield num as any;
	}
}
