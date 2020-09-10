import {framework, Component} from '../../deps.ts';
import {CounterService} from '../../services/counter.ts';

export class RootComponent extends Component {
	static NAME = "app-root";
	static HTML = 'root.html';
	static CSS = 'root.css';
	static META = import.meta;

	private form = {
		day: 20,
		month: 6
	};

	constructor() {
		super();
		const counterService = framework.service(CounterService);
		counterService.add();
		counterService.subscribe(evt => {});
	}

	alert() {
		alert(this.form.day + " - " + this.form.month);
	}
}
