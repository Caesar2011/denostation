import {Component} from '../../../framework/component.ts';
import {framework, ResourceService} from "../../deps.ts";

export class CounterComponent extends Component {
	static NAME = "app-counter";
	static HTML = 'counter.html';
	static META = import.meta;
	static INPUTS = ["value"];
	static OUTPUTS = ["value"];

	private readonly resService = framework.service(ResourceService);
	value = 10;

	constructor() {
		super();
	}

	down() {
		this.value--;
	}

	up() {
		this.value++;
	}

	async showValue(value: any) {
		return this.resService.getString("counter", value);
	}

	onInputChanged(attributeChanges: { [p: string]: [any, any] }) {
		super.onInputChanged(attributeChanges);
	}
}
