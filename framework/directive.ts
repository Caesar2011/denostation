import {Instantiable} from './utils/misc.ts';

export interface IDirective {
	collectInputChange(key: string, value: any): boolean;
	collectOutputChange(key: string, value: (evt: any) => void): boolean;
	notifyInputChanged(): void;
}


export class BaseDirective implements IDirective {
	constructor(protected readonly component: HTMLElement) { }

	collectInputChange(key: string, value: any): boolean {
		return false;
	}

	collectOutputChange(key: string, value: (evt: any) => void): boolean {
		return false;
	}

	notifyInputChanged(): void {
	}
}


type BaseDirectiveClass = Instantiable<BaseDirective>;
export type DirectiveClass = BaseDirectiveClass & {
	INPUTS?: string[],
	OUTPUTS?: string[]
};
