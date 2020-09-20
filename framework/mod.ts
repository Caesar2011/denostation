import {Framework} from './framework.ts';

export {Instantiable} from './utils/misc.ts';
export {resolve} from './utils/path.ts';
export {Framework} from './framework.ts';
export {Component} from './component.ts';
export {Pipe} from './pipe.ts';
export {Service} from "./service.ts";
export {ResourceService} from "./elements/services/ResourceService.ts";
export {JsonPipe} from "./elements/pipes/JsonPipe.ts";
export {ResourcePipe} from "./elements/pipes/ResourcePipe.ts";

export const framework = new Framework();
export {walkTheDOM} from "./utils/dom.ts";
