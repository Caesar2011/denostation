import { framework } from './deps.ts';
import {RootComponent} from './components/root/root.ts';
import {CounterService} from './services/counter.ts';
import {CounterComponent} from './components/counter/counter.ts';
import {PresenterComponent} from "./components/presenter/presenter.ts";
import {JsonPipe} from "../framework/elements/pipes/json.ts";

framework.component(RootComponent);
framework.component(CounterComponent);
framework.component(PresenterComponent);

framework.service(CounterService);

framework.pipe(JsonPipe);
