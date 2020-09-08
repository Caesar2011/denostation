import { framework } from './deps.ts';
import {RootComponent} from './components/root/root.ts';
import {CounterService} from './services/counter.ts';
import {CounterComponent} from './components/counter/counter.ts';

framework.component(RootComponent);
framework.component(CounterComponent);
framework.service(CounterService);
