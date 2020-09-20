import {Pipe, PipeFunc} from "../../pipe.ts";
import {ResourceService} from "../services/ResourceService.ts";
import {framework} from "../../mod.ts";

export const ResourcePipe: Pipe<string> = {
  NAME: "res",
  pipeConstructor(...args: string[]): PipeFunc<string> {
    const res = (args.length && args[0] !== "")
      ? args[0]
      : "";
    let service: ResourceService|undefined = undefined;
    return async (value: any) => {
      if (service === undefined) {
        service = framework.service(ResourceService);
      }
      return (value !== undefined && service !== undefined)
        ? await service.getString(res, value) || ""
        : "";
    };
  }
}
