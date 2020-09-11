import {Component} from '../../../framework/component.ts';

export class PresenterComponent extends Component {
	static NAME = "app-presenter";
	static HTML = 'presenter.html';
	static META = import.meta;
	static INPUTS = ["value"];

	str = "No value given!";

	set value(val: any) {
		this.str = String(val);
	}

	constructor() {
		super();
	}
}
