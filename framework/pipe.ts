import {Instantiable} from "./utils/misc.ts";

export type Pipe<T = any> = {
	NAME: string
} & Instantiable<BasePipe<T>>;

export abstract class BasePipe<T> {
	abstract transform(value: unknown, ...args: unknown[]): Promise<T>;
}

