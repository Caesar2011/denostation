import {Instantiable} from './utils/misc.ts';
import {BaseComponent} from './component.ts';

export interface IDirective {
	collectInputChange(key: string, value: any): boolean;
	collectOutputChange(key: string, value: (evt: any) => void): void;
	notifyInputChanged(): void;
}


export abstract class BaseDirective implements IDirective {
	constructor(protected component: HTMLElement) {
	}
}


type BaseDirectiveClass = Instantiable<BaseDirective>;
export type DirectiveClass = BaseDirectiveClass & {
	INPUTS?: string[],
	OUTPUTS?: string[]
};
