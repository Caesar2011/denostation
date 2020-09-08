import {Component} from '../../../framework/component.ts';

export class CounterComponent extends Component {
	static NAME = "app-counter";
	static HTML = 'counter.html';
	static META = import.meta;

	private value = 20;

	constructor() {
		super();
	}
}
