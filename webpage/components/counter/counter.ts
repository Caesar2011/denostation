import {Component} from '../../../framework/component.ts';

export class CounterComponent extends Component {
	static NAME = "app-counter";
	static HTML = 'counter.html';
	static META = import.meta;
	static INPUTS = ["value"];
	static OUTPUTS = ["value"];

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

	onInputChanged(attributeChanges: { [p: string]: [any, any] }) {
		super.onInputChanged(attributeChanges);
	}
}
