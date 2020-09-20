import {resolve} from './utils/path.ts';
import {framework, Instantiable, walkTheDOM} from './mod.ts';
import {ComponentProperties, UpgradedNode, upgradeNode} from "./utils/dom.ts";

const symUpdatesBeforeInit = Symbol("updatesBeforeInit");

type BaseComponentClass = Instantiable<BaseComponent>;
export type ComponentClass = BaseComponentClass & {
	NAME: string,
	HTML: string,
	CSS?: string,
	META: ImportMeta,
	INPUTS?: string[],
	OUTPUTS?: string[]
};

export class BaseComponent {
	root = (undefined as any as ShadowRoot & {host: HTMLDataElement<any>});
	private [symUpdatesBeforeInit]: {[_: string]: any} = {};

	onInit(root: ShadowRoot) {
		this.root = root as ShadowRoot & {host: HTMLDataElement<any>};
		this.root.host.updateDOM();
		for (const p in this[symUpdatesBeforeInit]) {
			if (this[symUpdatesBeforeInit].hasOwnProperty(p))
				this.root.host.fireOutput(p, this[symUpdatesBeforeInit][p]);
		}
	}

	onUpdate(p: PropertyKey, value: any, beforeValue: any) {
		if (typeof p !== "string") return;
		if (this.root) {
			this.root.host.updateDOM();
			this.root.host.fireOutput(p, value);
		} else {
		this[symUpdatesBeforeInit][p] = value;
		}
	}

	onAttributesChanged(attributeChanges: {[key: string]: [any, any]}): void {
	}

	onInputChanged(attributeChanges: {[key: string]: [any, any]}): void {
	}
}

const PROTECTED_PROPERTIES: (string|number|symbol)[] = ["root"];
const PROTECTED_METHODS: string[] = ["constructor", "onInit", "onUpdate", "onAttributesChanged", "onInputChanged"];

const handler: ProxyHandler<BaseComponent> = {
	set(target: BaseComponent, p: PropertyKey, value: any, receiver: any): boolean {
		const beforeValue: any = (target as any)[p];
		const success = Reflect.set(target, p, value, receiver);
		if (success) {
			if (PROTECTED_PROPERTIES.includes(p)) {
				Object.defineProperty(target, p, { configurable: false, writable: false });
			} else if (beforeValue !== value) {
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

export interface HTMLDataElement<T extends BaseComponent = BaseComponent> extends HTMLElement {
	data: T;
	updateDOM(): void;
	fireOutput(p: string, value: any): void;
	collectInputChange(key: string, value: any): void;
	collectOutputChange(key: string, value: (evt: any) => void): void;
	notifyInputChanged(): void;
}

export function ComponentWrapper(base: ComponentClass): Instantiable<HTMLElement> {
	return class extends HTMLElement implements HTMLDataElement {

		data: BaseComponent;
		private properties: ComponentProperties;
		private readonly root: ShadowRoot;
		private inputChanges: {[key: string]: [any, any]} = {};
		private outputs: {[key: string]: (evt: any) => void} = {};

		constructor() {
			super();

			new MutationObserver(mutations => this.onMutation(mutations))
				.observe(this, {attributes: true, attributeOldValue: true});

			this.root = this.attachShadow({mode: 'closed'});
			this.data = new base();
			this.properties = this.getProperties();
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

		updateDOM(): void {
			walkTheDOM(this.root, (node: Node) => {
				(node as UpgradedNode)
					.updateAttributes(this.data)
					.catch(err => console.error("Error on resolving DOM update!", err));
			});
		}

		fireOutput(p: string, value: any): void {
			if (this.outputs.hasOwnProperty(p))
				this.outputs[p](value);
		}

		private onMutation(mutations: MutationRecord[]) {
			const attributeChanges: {[key: string]: [any, any]} = {};
			let found = false;
			for (const mutation of mutations) {
				if (mutation.type === "attributes") {
					const attributeName = mutation.attributeName || "null";
					const value = this.getAttribute(attributeName);
					if (mutation.oldValue !== value) {
						attributeChanges[attributeName] = [mutation.oldValue, value];
						found = true;
					}
				}
			}
			if (found)
				this.data.onAttributesChanged(attributeChanges);
		}

		collectInputChange(key: string, value: any): void {
			if (!(base.INPUTS || []).includes(key)) {
				console.error(`The component '${base.NAME}' does not export '${key}' as input.`);
				return;
			}
			if (this.properties.setter.includes(key) && (this.data as any)[key] !== value) {
				(this.data as any)[key] = value;
				this.inputChanges[key] = value;
			}
		}

		collectOutputChange(key: string, value: (evt: any) => void): void {
			if (!(base.OUTPUTS || []).includes(key)) {
				console.error(`The component '${base.NAME}' does not export '${key}' as output.`);
				return;
			}
			if (this.properties.setter.includes(key)) {
				this.outputs[key] = value;
			}
		}

		notifyInputChanged(): void {
			if (Object.keys(this.inputChanges).length > 0) {
				this.data.onInputChanged(this.inputChanges);
				this.inputChanges = {};
			}
		}

		getProperties(): ComponentProperties {
			const prototype = Reflect.getPrototypeOf(this.data);
			const properties = Object
				.getOwnPropertyNames(this.data)
				.filter((elem => !PROTECTED_PROPERTIES.includes(elem)));
			const allMethods = Object
				.getOwnPropertyNames(prototype)
				.filter((elem => !PROTECTED_METHODS.includes(elem)));
			const methods: any[] = [];
			const getter = [...properties];
			const setter = [...properties];
			for (const method of allMethods) {
				if (typeof (this.data as any)[method] === 'function') {
					methods.push(method);
				} else {
					const descriptor = Object.getOwnPropertyDescriptor(prototype, method) || {};
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
