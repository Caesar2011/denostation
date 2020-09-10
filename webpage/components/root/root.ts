import {framework, Component} from '../../deps.ts';
import {CounterService} from '../../services/counter.ts';

export class RootComponent extends Component {
	static NAME = "app-root";
	static HTML = 'root.html';
	static CSS = 'root.css';
	static META = import.meta;

	private valueRoot = 20;
	private backStyle = "";

	set setter(val: string) {
		console.log("setter", val);
	}

	get getter(): number {
		return this.valueRoot;
	}

	constructor() {
		super();
		const counterService = framework.service(CounterService);
		counterService.add();
		counterService.subscribe(evt => {});
		this.setter = "cool";

		setTimeout(() => {
			this.backStyle = "background-color: blue";
		}, 1000);
	}

	addToGetter() {
		this.valueRoot++;
	}
}
