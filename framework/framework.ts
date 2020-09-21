import {Service, walkTheDOM} from './mod.ts';
import {ComponentClass, ComponentWrapper} from './component.ts';
import {Pipe, PipeConstructor} from './pipe.ts';
import {deepFreeze} from './utils/freeze.ts';
import {isHTMLDataElement} from "./utils/dom.ts";

export class Framework {

	private readonly services = new Map<Service<any>, any>();
	private readonly _pipes: {[_: string]: PipeConstructor} = {};
	readonly pipes = deepFreeze(this._pipes);

	constructor() {
		window.addEventListener('DOMContentLoaded', () => {
			this.setupNodes(document);
		}, false);
	}

	directive() {
	}

	pipe(pipe: Pipe) {
		this._pipes[pipe.NAME] = pipe.pipeConstructor;
	}

	component(component: ComponentClass): void {
		if (!window.customElements.get(component.NAME)) {
			window.customElements.define(component.NAME, ComponentWrapper(component));
		}
	}

	service<T>(service: Service<T>, ...args: any[]): T {
		let instance = this.services.get(service);
		if (!instance) {
			instance = new service(...args);
			this.services.set(service, instance);
		}
		return instance;
	}

	notifyNodeUpdate() {
		walkTheDOM(document, node => {
			if (isHTMLDataElement(node)) {
				node.updateDOM(true);
			}
		});
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
}
