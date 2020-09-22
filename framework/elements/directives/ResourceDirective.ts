import {BaseDirective} from "../../directive.ts";
import {framework, ResourceService} from "../../mod.ts";
import {debounce} from "../../utils/misc.ts";

export class ResourceDirective extends BaseDirective {

  static readonly INPUTS = ["res"];
  private readonly res = framework.service(ResourceService);
  private value: string|undefined;

  constructor(component: HTMLElement) {
    super(component);
    this.res.registerConstraintChange(debounce(() => this.update(), 200))
  }

  collectInputChange(key: string, value: any): boolean {
    if (this.component instanceof HTMLImageElement) {
      if (key === "res") {
        if (value) {
          this.value = value;
          this.update();
        }
        return true;
      }
    }
    return false;
  }

  private update() {
    if (!this.value) return;
    this.res.getDrawable(this.value)
      .then(drawable => {
        const comp = this.component as HTMLImageElement;
        comp.src = drawable.src || console.warn(`Image '${this.value}' not found!`) || "";
        comp.alt = drawable.alt || console.warn(`No alt tag for image '${this.value}' provided!`) || "";
      });
  }
}
