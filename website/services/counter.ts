export class CountUpEvent extends CustomEvent<number> {}

export class CounterService {
	private events = new EventTarget();
	private counter = 0;

	reset() {
		this.counter = 0;
	}

	subscribe(callback: (count: CountUpEvent) => void) {
		this.events.addEventListener('countup', callback as (_: Event) => void);
		callback(this.getEvent());
	}

	add() {
		this.counter++;
		this.events.dispatchEvent(this.getEvent());
	}

	getEvent(): CountUpEvent {
		return new CountUpEvent('countup', {detail: this.counter});
	}
}
