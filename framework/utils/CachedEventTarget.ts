export class CachedEventTarget extends EventTarget {

  private lastValues: {[type: string]: Event} = {};

  public dispatchEvent(event: Event): boolean {
    this.lastValues[event.type] = event;
    return super.dispatchEvent(event);
  }

  public addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
    const once = options && typeof options !== "boolean" && options.once;
    if (once && this.lastValues.hasOwnProperty(type) && listener) {
      if (listener.hasOwnProperty("handleEvent")) {
        (listener as EventListenerObject).handleEvent(this.lastValues[type]);
      } else {
        (listener as EventListener)(this.lastValues[type]);
      }
    }
    return super.addEventListener(type, listener, options);
  }
}
