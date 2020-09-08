import {resolve} from './utils/path.ts';
import {framework, Instantiable} from './mod.ts';
import getPrototypeOf = Reflect.getPrototypeOf;

type BaseComponentClass = Instantiable<BaseComponent>;
export type ComponentClass = BaseComponentClass & {
	NAME: string,
	HTML: string,
	CSS?: string,
	META: ImportMeta,
	INPUTS?: string[],
	OUTPUTS?: string[]
};

class BaseComponent {
	root = (undefined as any as ShadowRoot & {host: HTMLDataElement<any>});
	private updates: [string, any][] = [];

	onInit(root: ShadowRoot) {
		this.root = root as ShadowRoot & {host: HTMLDataElement<any>};
		let update: [string, any]|undefined;
		while (update = this.updates.pop()) {
			this.root.host.update(...update);
		}
	}

	onUpdate(p: PropertyKey, value: any, beforeValue: any) {
		if (typeof p !== "string") return;
		if (!this.root) {
			this.updates.push([p, value]);
		} else {
			this.root.host.update(p, value);
		}
	}
}

const PROTECTED_PROPERTIES: (string|number|symbol)[] = ["root"];
const PROTECTED_METHODS: string[] = ["constructor", "onInit"];

const handler: ProxyHandler<BaseComponent> = {
	set(target: BaseComponent, p: PropertyKey, value: any, receiver: any): boolean {
		const beforeValue: any = (target as any)[p];
		const success = Reflect.set(target, p, value, receiver);
		if (success) {
			if (PROTECTED_PROPERTIES.includes(p)) {
				Object.defineProperty(target, p, { configurable: false, writable: false });
			} else {
				console.log(`update >${p.toString()}< to value >${value}< on target:`, target, 'receiver:', receiver);
				target.onUpdate(p, value, beforeValue);
			}
		}
		return success;
	}
}

const constructHandler: ProxyHandler<BaseComponentClass> = {
	construct(target: BaseComponentClass, argArray: any, newTarget?: any): object {
		const obj: BaseComponent = Reflect.construct(target, argArray, newTarget);
		return new Proxy(obj, handler);
	}
}

export const Component: BaseComponentClass = new Proxy(BaseComponent, constructHandler);

export interface HTMLDataElement<T extends BaseComponent> extends HTMLElement {
	data: T;
	update(p: string, value: any): void;
}

export function ComponentWrapper(base: ComponentClass): Instantiable<HTMLElement> {
	return class extends HTMLElement implements HTMLDataElement<BaseComponent> {

		data: BaseComponent;

		constructor() {
			super();
			this.data = new base();
			this.setup().then(() => {});
		}

		private async setup() {
			const root = this.attachShadow({mode: 'closed'});

			const baseUrl = (base.META as { url: string }).url;
			const htmlPath = resolve(baseUrl, "../", base.HTML);
			const res = await fetch(htmlPath);
			root.innerHTML = await res.text();

			if (base.CSS) {
				const cssPath = resolve(baseUrl, "../", base.CSS);
				const link = document.createElement('link');
				link.setAttribute('rel', 'stylesheet');
				link.setAttribute('href', cssPath);
				root.appendChild(link);
			}
			this.dispatchEvent(new CustomEvent('custom', {detail: 4}));

			this.getProperties();

			framework.setupNodes(root, node => {
				console.log("child", node);
			});
			this.data.onInit(root);
			console.log("who is root?", this.getRootNode());
		}

		update(p: string, value: any): void {
			console.log("update", p, value);
		}

		getProperties() {
			console.log(1, Object.keys(this.data));
			console.log(2, Object.getOwnPropertyNames(this.data));
			console.log(3, Object.getOwnPropertySymbols(this.data));
			console.log(4, Object.getOwnPropertyNames(this.data)
				.filter(
					e => typeof (this.data as any)[e] === 'function'
				)
			);

			console.log(5, Object.getOwnPropertyNames(getPrototypeOf(this.data)));
		}
	}
}
