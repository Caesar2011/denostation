import {BasePipe} from "../../pipe.ts";
import {ResourceService} from "../services/ResourceService.ts";
import {framework} from "../../mod.ts";

export class ResourcePipe extends BasePipe<string> {
  static NAME = "res";

  private service: ResourceService|undefined;

  protected getResourceService(): ResourceService {
    if (this.service === undefined) {
      this.service = framework.service(ResourceService);
    }
    return this.service;
  }

  async transform(value: unknown, ...args: unknown[]): Promise<string> {
    const res = (args.length && args[0] !== "")
      ? String(args[0])
      : "";
    const service = this.getResourceService();
    return (value !== undefined && service !== undefined)
      ? await service.getString(res, value, args.slice(1)) || ""
      : "";
  }
}
