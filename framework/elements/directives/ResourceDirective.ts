import {BaseDirective} from "../../directive.ts";
import {framework, ResourceService} from "../../mod.ts";
import {debounce} from "../../utils/misc.ts";

export class ResourceDirective extends BaseDirective {

  static readonly INPUTS = ["res"];
  private readonly res = framework.service(ResourceService);
  private value: string|undefined;

  constructor(component: HTMLElement) {
    super(component);
    console.log("CONSTRUCTOR", component);
    this.res.registerConstraintChange(debounce(() => {
      if (this.component instanceof HTMLImageElement) this.updateDrawable();
      if (this.component instanceof HTMLStyleElement) this.updateStyle();
    }, 200));
  }

  collectInputChange(key: string, value: any): boolean {
    console.log("change key", this.component);
    if (key === "res") {
      if (this.component instanceof HTMLImageElement) {
        if (this.updateAndCheckForChange(value)) this.updateDrawable();
        return true;
      } else if (this.component instanceof HTMLStyleElement) {
        if (this.updateAndCheckForChange(value)) this.updateStyle();
        return true;
      }
    }
    return false;
  }

  private updateDrawable() {
    if (!this.value) return;
    this.res.getDrawable(this.value)
      .then(drawable => {
        const comp = this.component as HTMLImageElement;
        if (comp.src !== drawable.src)
          comp.src = drawable.src || console.warn(`Image '${this.value}' not found!`) || "";
        if (comp.alt !== drawable.alt)
          comp.alt = drawable.alt || console.warn(`No alt tag for image '${this.value}' provided!`) || "";
      });
  }

  private updateStyle() {
    if (!this.value) return;
    this.res.getStyles(this.value)
      .then(styles => {
        const comp = this.component as HTMLStyleElement;
        const innerText = styles.reverse().map(style => `@import url("${style}");`).join("");
        if (comp.innerText !== innerText)
          comp.innerText = innerText;
      });
  }

  private updateAndCheckForChange(value: any): boolean {
    if (this.value === value || !value) return false;
    this.value = value;
    return true;
  }
}
