import {Component} from '../../../framework/component.ts';

export class CounterComponent extends Component {
	static NAME = "app-counter";
	static HTML = 'counter.html';
	static META = import.meta;
	static INPUTS = ["start"];

	private value = 10;

	set start(val: number) {
		this.value = val;
	}

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
