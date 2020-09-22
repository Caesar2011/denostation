export type Instantiable<T = any> = {new(...args: any[]): T};

export function betterEval(code: string, useStrict: boolean = true): any {
	const data = `${useStrict ? '"use strict";' : ''}return (${code})`;
	return Function(data)();
}

export function hasOwnProperty<T extends object, K extends keyof T>(object: T, key: string|number|symbol): key is K {
	return object.hasOwnProperty(key);
}

export function* iterateEnum(x: any): Generator<number> {
	for (let item in x) {
		if (!x.hasOwnProperty(item)) continue;
		const num = Number(item);
		if (isNaN(num)) continue;
		yield num as any;
	}
}

export function debounce(func: Function, wait: number) {
	let timeout: number;
	return function executedFunction(...args: any[]) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}
