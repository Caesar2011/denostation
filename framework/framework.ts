import {framework, Service, walkTheDOM} from './mod.ts';
import {ComponentClass, ComponentWrapper} from './component.ts';
import {Pipe, PipeConstructor} from './pipe.ts';
import {deepFreeze} from './utils/freeze.ts';
import {isHTMLDataElement, UpgradedNode, upgradeNode} from "./utils/dom.ts";
import {DirectiveClass} from './directive.ts';

export class Framework {

	private readonly services = new Map<Service<any>, any>();
	private readonly directivesInput = new Map<string, DirectiveClass[]>();
	private readonly directivesOutput = new Map<string, DirectiveClass[]>();
	private readonly directivesAdded = new Set<DirectiveClass>();
	private readonly _pipes: {[_: string]: PipeConstructor} = {};
	readonly pipes = deepFreeze(this._pipes);

	constructor() {
		window.addEventListener('DOMContentLoaded', () => {
			framework.setupNodes(document);
			walkTheDOM(document, node => {
				(node as UpgradedNode)
					.updateAttributes({})
					.catch(err => console.error("Error on resolving DOM update!", err));
			});
		}, false);
	}

	directive(directive: DirectiveClass): void;
	directive(directive: string, isInput: boolean): DirectiveClass[];
	directive(directive: DirectiveClass|string, isInput: boolean = false): void|DirectiveClass[] {
		if (typeof directive === 'string') {
			return (isInput ? this.directivesInput : this.directivesOutput).get(directive) || [];
		} else {
			if (!this.directivesAdded.has(directive)) {
				this.directivesAdded.add(directive);
				for (let input of (directive.INPUTS || [])) {
					const directives = this.directivesInput.get(input) || [];
					directives.push(directive);
					this.directivesInput.set(input, directives);
				}
				for (let output of (directive.OUTPUTS || [])) {
					const directives = this.directivesOutput.get(output) || [];
					directives.push(directive);
					this.directivesOutput.set(output, directives);
				}
			}
		}
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

	setupNodes(root: Node): void {
		walkTheDOM(root, node => {
			upgradeNode(node);
		});
	}
}
