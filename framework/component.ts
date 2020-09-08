import {resolve} from './utils/path.ts';
import {framework, Instantiable, walkTheDOM} from './mod.ts';
import getPrototypeOf = Reflect.getPrototypeOf;
import {ComponentProperties, UpgradedNode, upgradeNode} from "./utils/dom.ts";

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

const PROTECTED_PROPERTIES: (string|number|symbol)[] = ["root", "updates"];
const PROTECTED_METHODS: string[] = ["constructor", "onInit", "onUpdate"];

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
		private readonly root: ShadowRoot;

		constructor() {
			super();

			new MutationObserver(mutations => this.onMutation(mutations)).observe(this, {attributes: true, attributeOldValue: true});

			this.root = this.attachShadow({mode: 'closed'});
			this.data = new base();
			this.setup().then(() => {});
		}

		private async setup() {
			const baseUrl = (base.META as { url: string }).url;
			const htmlPath = resolve(baseUrl, "../", base.HTML);
			const res = await fetch(htmlPath);
			this.root.innerHTML = await res.text();

			if (base.CSS) {
				const cssPath = resolve(baseUrl, "../", base.CSS);
				const link = document.createElement('link');
				link.setAttribute('rel', 'stylesheet');
				link.setAttribute('href', cssPath);
				this.root.appendChild(link);
			}
			this.dispatchEvent(new CustomEvent('custom', {detail: 4}));

			framework.setupNodes(this.root, node => {
				upgradeNode(node);
			});
			this.data.onInit(this.root);
		}

		update(p: string, value: any): void {
			console.log("update");
			walkTheDOM(this.root, (node: Node) => {
				(node as UpgradedNode).update(this.data);
			});
		}

		onMutation(mutations: MutationRecord[]) {
			const attributeChanges: {[key: string]: [any, any]} = {};
			let found = false;
			for (const mutation of mutations) {
				if (mutation.type === "attributes") {
					const attributeName = mutation.attributeName ?? "null";
					const value = this.getAttribute(attributeName);
					if (mutation.oldValue !== value) {
						attributeChanges[attributeName] = [mutation.oldValue, value];
						found = true;
					}
				}
			}
			if (found)
				this.attributeChanges(attributeChanges);
		}

		attributeChanges(mutation: {[key: string]: [any, any]}) {
			console.log("MUTATION", mutation);
		}

		getProperties(): ComponentProperties {
			const prototype = getPrototypeOf(this.data);
			const properties = Object
				.getOwnPropertyNames(this.data)
				.filter((elem => !PROTECTED_PROPERTIES.includes(elem)));
			const allMethods = Object
				.getOwnPropertyNames(prototype)
				.filter((elem => !PROTECTED_METHODS.includes(elem)));
			const methods = [];
			const getter = [...properties];
			const setter = [...properties];
			for (const method of allMethods) {
				if (typeof (this.data as any)[method] === 'function') {
					methods.push(method);
				} else {
					const descriptor = Object.getOwnPropertyDescriptor(prototype, method) ?? {};
					if (descriptor.get) {
						getter.push(method);
					}
					if (descriptor.set) {
						setter.push(method);
					}
				}
			}

			return { methods, getter, setter };
		}
	}
}
