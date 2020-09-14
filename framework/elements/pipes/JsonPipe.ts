import {Pipe, PipeFunc} from "../../pipe.ts";

export const JsonPipe: Pipe<string> = {
  NAME: "json",
  pipeConstructor(...args: string[]): PipeFunc<string> {
    const spacing = (args.length && args[0] !== "")
      ? args[0]
      : undefined;
    return async (value: any) => {
      return (spacing !== undefined)
        ? JSON.stringify(value, null, spacing)
        : JSON.stringify(value);
    };
  }
}
