export type PipeFunc<T = any> = ((value: any) => Promise<T>|T);
export type PipeConstructor<T = any> = (...args: string[]) => PipeFunc<T>;

export type Pipe<T = any> = {
	NAME: string,

	pipeConstructor(...args: string[]): PipeFunc<T>;
}

