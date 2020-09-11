export type PipeFunc<T = any> = ((value: any) => Promise<T>|T);
export type PipeConstructor<T = any> = (...args: string[]) => PipeFunc<T>;

export type Pipe<T = any> = {
	NAME: string,

	pipeConstructor(...args: string[]): PipeFunc<T>;
}

export const JsonPipe: Pipe<string> = {
	NAME: "json",
	pipeConstructor(...args: string[]): PipeFunc<string> {
		const spacing = (args.length && args[0] !== "")
			? args[0]
			: undefined;
		return async (value: any) => {
			return (spacing !== undefined)
				? JSON.stringify(value, undefined, spacing)
			  : JSON.stringify(value);
		};
	}
}
