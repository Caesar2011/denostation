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

	showPromise: Promise<any>|any;

	constructor() {
		super();
		const counterService = framework.service(CounterService);
		counterService.add();
		counterService.subscribe(evt => {});
		this.showPromise = new Promise<any>((resolve => {
			setTimeout(() => resolve({value: "some", hello: "world", num: 10}), 1000);
		}))
	}

	alert() {
		alert(this.form.day + " - " + this.form.month);
	}
}
