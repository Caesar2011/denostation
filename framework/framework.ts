import {Service, walkTheDOM} from './mod.ts';
import {ComponentClass, ComponentWrapper} from './component.ts';
//import {upgradeEventTargetPrototype} from "./utils/misc.ts";

export class Framework {

	private services = new Map<Service<any>, any>();

	constructor() {
		//upgradeEventTargetPrototype();
		window.addEventListener('DOMContentLoaded', () => {
			console.log("DOM loaded");
			this.setupNodes(document);
		}, false);
	}

	directive() {

	}

	component(component: ComponentClass): void {
		if (!window.customElements.get(component.NAME)) {
			window.customElements.define(component.NAME, ComponentWrapper(component));
		}
	}

	setupNodes(node: Node, callback?: (node: Node) => void): void {
		walkTheDOM(node, node => {
			if (callback) callback(node);
			if (node instanceof HTMLElement) {
				if (node.hasAttribute("*if")) {

				}
			}
		});
	}

	service<T>(service: Service<T>): T {
		let instance = this.services.get(service);
		if (!instance) {
			instance = new service();
			this.services.set(service, instance);
		}
		return instance;
	}
}
