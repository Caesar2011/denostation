import {framework, Component} from '../../deps.ts';
import {CounterService} from '../../services/counter.ts';

export class RootComponent extends Component {
	static NAME = "app-root";
	static HTML = 'root.html';
	static CSS = 'root.css';
	static META = import.meta;

	private value = 20;

	set setter(val: string) {
		console.log("setter", val);
	}

	get getter(): number {
		return this.value;
	}

	constructor() {
		super();
		const counterService = framework.service(CounterService);
		counterService.add();
		counterService.subscribe(evt => console.log(evt.detail));
		this.setter = "cool";
	}

	addToGetter() {
		this.value++;
	}
}
