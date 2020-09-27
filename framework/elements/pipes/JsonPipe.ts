import {BasePipe} from "../../pipe.ts";

export class JsonPipe extends BasePipe<string> {
  static NAME = "json";

  async transform(value: unknown, ...args: unknown[]): Promise<string> {
    console.log("jsonpipe", args);
    const spacing = (args.length && args[0] !== "")
      ? String(args[0])
      : undefined;
    return (spacing !== undefined)
      ? JSON.stringify(value, null, spacing)
      : JSON.stringify(value);
  }
}
