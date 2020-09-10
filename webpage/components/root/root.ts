import {framework, Component} from '../../deps.ts';
import {CounterService} from '../../services/counter.ts';

export class RootComponent extends Component {
	static NAME = "app-root";
	static HTML = 'root.html';
	static CSS = 'root.css';
	static META = import.meta;

	private backStyle = "";
	private counterValue: number|undefined = 20;

	constructor() {
		super();
		const counterService = framework.service(CounterService);
		counterService.add();
		counterService.subscribe(evt => {});

		setTimeout(() => {
			this.backStyle = "border: 1px solid red;";
		}, 1000);
	}

	resetCounter() {
		this.counterValue = 20;
	}
}
