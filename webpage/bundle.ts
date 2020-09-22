import {framework, ResourceService, JsonPipe, ResourcePipe} from './deps.ts';
import {RootComponent} from './components/root/root.ts';
import {CounterService} from './services/counter.ts';
import {CounterComponent} from './components/counter/counter.ts';
import {PresenterComponent} from "./components/presenter/presenter.ts";
import {ResourceDirective} from "../framework/elements/directives/ResourceDirective.ts";

framework.component(RootComponent);
framework.component(CounterComponent);
framework.component(PresenterComponent);

framework.service(CounterService);
framework.service(ResourceService, "/res");

framework.pipe(JsonPipe);
framework.pipe(ResourcePipe);

framework.directive(ResourceDirective);

