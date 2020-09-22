import {CachedEventTarget} from "../../utils/CachedEventTarget.ts";

import {
  ASPECT_RATIO, CONSTRAINT_GENERATORS, CONSTRAINT_REGEX,
  Constraints, EntityPaths, LAYOUT_DIRECTION, NIGHT_MODE,
  RESOURCE_VERSION,
  ResourceFile, ResourceFolder, SCREEN_ORIENTATION,
  SCREEN_SIZE, TOUCH_MODE
} from "../../utils/resource-mapping.ts";
import {debounce, hasOwnProperty} from "../../utils/misc.ts";
import {sprintf} from "../../utils/sprintf.ts";
import {framework} from "../../mod.ts";

export class ResourceService extends CachedEventTarget {
  private constraints: {[key in Constraints]: string|undefined} = {
    [Constraints.LANG]: this.initLanguage(),
    [Constraints.REGION]: this.initRegion(),
    [Constraints.LAYOUT_DIRECTION]: this.initLayoutDirection(),
    [Constraints.WIDTH]: this.initWidth(),
    [Constraints.HEIGHT]: this.initHeight(),
    [Constraints.SCREEN_SIZE]: this.initScreenSize(),
    [Constraints.SCREEN_ASPECT]: this.initScreenAspectRatio(),
    [Constraints.SCREEN_ORIENTATION]: this.initScreenOrientation(),
    [Constraints.NIGHT_MODE]: this.initNightMode(),
    [Constraints.IS_TOUCH]: this.initIsTouch(),
    [Constraints.BROWSER_NAME]: undefined,
    [Constraints.BROWSER_VERSION]: undefined,
  };
  private fetchedResources: {[resUri: string]: Array<[(val: any) => void, (val: any) => void]>| { consumed: any }} = {};
  protected readonly DEFAULT_PLURAL_RULES = {select: (quantity: number) => "other"};
  private pluralRules: {select(quantity: number): string} = this.DEFAULT_PLURAL_RULES;
  private widthPx: number = window.innerWidth || document.body.clientWidth;
  private heightPx: number = window.innerHeight || document.body.clientHeight;
  protected debouncedUpdateDom = debounce(framework.notifyNodeUpdate, 200);

  public get lang() { return this.get(Constraints.LANG); }
  public set lang(val: string|undefined) { this.set(Constraints.LANG, val); this.updatePluralRules(); }
  public get region() { return this.get(Constraints.REGION); }
  public set region(val: string|undefined) { this.set(Constraints.REGION, val); this.updatePluralRules(); }
  public get layoutDirection() { return this.get(Constraints.LAYOUT_DIRECTION) as LAYOUT_DIRECTION|undefined; }
  public set layoutDirection(val: LAYOUT_DIRECTION|undefined) { this.set(Constraints.LAYOUT_DIRECTION, val); }
  public get width() { return this.get(Constraints.WIDTH); }
  private set _width(val: string|undefined) { this.set(Constraints.WIDTH, val); }
  public get height() { return this.get(Constraints.HEIGHT); }
  private set _height(val: string|undefined) { this.set(Constraints.HEIGHT, val); }
  public get screenSize() { return this.get(Constraints.SCREEN_SIZE) as SCREEN_SIZE|undefined; }
  private set _screenSize(val: SCREEN_SIZE|undefined) { this.set(Constraints.SCREEN_SIZE, val); }
  public get screenAspect() { return this.get(Constraints.SCREEN_ASPECT) as ASPECT_RATIO; }
  private set _screenAspect(val: ASPECT_RATIO) { this.set(Constraints.SCREEN_ASPECT, val); }
  public get screenOrientation() { return this.get(Constraints.SCREEN_ORIENTATION) as SCREEN_ORIENTATION; }
  private set _screenOrientation(val: SCREEN_ORIENTATION) { this.set(Constraints.SCREEN_ORIENTATION, val); }
  public get nightMode() { return this.get(Constraints.NIGHT_MODE) as NIGHT_MODE; }
  public set nightMode(val: NIGHT_MODE) { this.set(Constraints.NIGHT_MODE, val); }
  public get isTouch() { return this.get(Constraints.IS_TOUCH) as TOUCH_MODE|undefined; }
  public set isTouch(val: TOUCH_MODE|undefined) { this.set(Constraints.IS_TOUCH, val); }
  public get browserName() { return this.get(Constraints.BROWSER_NAME) as string|undefined; }
  public get browserVersion() { return this.get(Constraints.BROWSER_VERSION) as string|undefined; }

  protected get(constraint: Constraints) {
    return this.constraints[constraint];
  }
  protected set(constraint: Constraints, value: string|undefined) {
    if (value && value.match(CONSTRAINT_REGEX[constraint])) {
      this.constraints[constraint] = value;
      this.emitConstraintChange(constraint);
    }
  }

  constructor(private resFolder: string) {
    super();
    this.getResources()
      .then(resources => {
        if (resources.version !== RESOURCE_VERSION)
          console.error("Resource file version does not match! Resource resolution may not work and cause errors.");
      })
      .catch((e) => console.error("Loading resources failed!", e));
    window.addEventListener("resize", () => {
      this._width = this.initWidth();
      this._height = this.initHeight();
      this._screenSize = this.initScreenSize();
      this._screenAspect = this.initScreenAspectRatio();
      this._screenOrientation = this.initScreenOrientation();
    });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        this.nightMode = this.initNightMode();
      });
    }

    const info = this.initBrowserInfo();
    this.constraints[Constraints.BROWSER_NAME] = info[0];
    this.constraints[Constraints.BROWSER_VERSION] = info[1] !== undefined ? info[1]+"v" : undefined;
    this.updatePluralRules();
  }

  protected async getResources(): Promise<ResourceFile> {
    return this.fetchFile("list.json", res => res.json());
  }

  protected initLanguage(): string|undefined {
    const browserLang = navigator.language || (navigator as any).userLanguage || undefined;
    return browserLang ? browserLang.substring(0, 2) : undefined;
  }

  protected initRegion(): string|undefined {
    const browserLang = navigator.language || (navigator as any).userLanguage || undefined;
    return (browserLang && browserLang.length === 5) ? browserLang.substring(3, 5) : undefined;
  }

  protected initLayoutDirection(): LAYOUT_DIRECTION|undefined {
    const elem = document.querySelectorAll("html").item(0);
    return elem && (elem.dir as LAYOUT_DIRECTION) || undefined;
  }

  protected initWidth(): string|undefined {
    this.widthPx = window.innerWidth || document.body.clientWidth;
    return this.widthPx !== undefined ? this.widthPx+"w" : undefined;
  }

  protected initHeight(): string|undefined {
    this.heightPx = window.innerHeight || document.body.clientHeight;
    return this.heightPx !== undefined ? this.heightPx+"h" : undefined;
  }

  protected initScreenSize(): SCREEN_SIZE|undefined {
    const h = this.heightPx || 320;
    const w = this.widthPx || 460;
    const area = h*w;
    if (area > 1000*1600) return "xlarge";
    else if (area > 840*1020) return "large";
    else if (area > 460*640) return "normal";
    else if (area > 320*426) return "small";
    else return undefined;
  }

  protected initScreenAspectRatio(): ASPECT_RATIO {
    const h = this.heightPx || 320;
    const w = this.widthPx || 460;
    const aspect = Math.max(h, w) / Math.min(h, w);
    return aspect > 1.5 ? "long" : "notlong";
  }

  protected initScreenOrientation(): SCREEN_ORIENTATION {
    const h = this.heightPx || 320;
    const w = this.widthPx || 460;
    return h > w ? "port" : "land";
  }

  protected initNightMode(): NIGHT_MODE {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? "night" : "notnight";
  }

  protected initIsTouch(): TOUCH_MODE {
    let touch;
    if (window.matchMedia) {
      touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    } else {
      touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    }
    return touch ? "touch" : "nottouch";
  }

  public registerConstraintChange(func: (evt: Event) => void) {
    this.addEventListener("constraintChange", func);
  }

  private emitConstraintChange(constraint: Constraints) {
    this.dispatchEvent(new CustomEvent("constraintChange", {detail: constraint}));
    this.debouncedUpdateDom();
  }

  protected async *fileIterator(dir: ResourceFolder, file: string): AsyncGenerator<any> {
    const that = this;
    function* findResourcePaths(paths: EntityPaths): Generator<string> {
      if (paths.subPaths && paths.nextConstraint) {
        const nextConstraint = Number(paths.nextConstraint) as Constraints;
        const keys = Object.keys(paths.subPaths).filter(x => x !== "*");
        const curr = that.constraints[nextConstraint];
        if (curr) {
          for (const key of CONSTRAINT_GENERATORS[nextConstraint](curr, keys)) {
            for (const path of findResourcePaths(paths.subPaths[key])) {
              yield path;
            }
          }
        }
        if (paths.subPaths.hasOwnProperty("*")) {
          for (const path of findResourcePaths(paths.subPaths["*"])) {
            yield path;
          }
        }
      }
      if (paths.defPath) yield paths.defPath;
    }
    const resources = await this.getResources();
    if (resources) {
      for (const path of findResourcePaths(resources[dir][file])) {
        yield path;
      }
    }
  }

  protected async fetchFile(path: string, consumer: (res: Response) => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (hasOwnProperty(this.fetchedResources, path)) {
        if (hasOwnProperty(this.fetchedResources[path], "consumed")) {
          resolve((this.fetchedResources[path] as {consumed: any}).consumed);
          return;
        } else
          (this.fetchedResources[path] as Array<any>).push([resolve, reject]);
      } else {
        this.fetchedResources[path] = [[resolve, reject]];
        const url = new URL([window.location.href, this.resFolder, path].join("/")).href;
        fetch(url).then(async res => {
          const callbacks = (this.fetchedResources[path] as Array<any>);
          const consumed = await consumer(res);
          this.fetchedResources[path] = {consumed};
          callbacks.forEach(arr => arr[0](consumed));
        }).catch(err => {
          const callbacks = (this.fetchedResources[path] as Array<any>);
          delete this.fetchedResources[path];
          callbacks.forEach(arr => arr[1](err));
        });
      }
    });
  }

  protected async getResourceValue(dir: "values", file: string, res: string): Promise<any> {
    for await (const path of this.fileIterator(dir, file)) {
      const json = await this.fetchFile(path, f => f.json());
      if (hasOwnProperty(json, res)) return json[res];
    }
    return undefined;
  }

  protected async getResourcePath(dir: "drawables", file: string): Promise<string|undefined> {
    for await (const path of this.fileIterator(dir, file)) {
      return path;
    }
    return undefined;
  }

  protected async getResourcePaths(dir: "styles", file: string): Promise<string[]> {
    const paths = [];
    for await (const path of this.fileIterator(dir, file)) {
      paths.push(path);
    }
    return paths;
  }

  public async getDrawable(res: string): Promise<{ src: string|undefined, alt: string|undefined }> {
    const [alt, path] = await Promise.all([
      this.getResourceValue("values", "alt.json", res),
      this.getResourcePath("drawables", res)
    ]);
    const src = new URL([window.location.href, this.resFolder, path].join("/")).href;
    return { src, alt };
  }

  public async getString(res: string, ...params: any[]): Promise<string | undefined> {
    const value = await this.getResourceValue("values", "strings.json", res);
    if (value && typeof value === "string") {
      return sprintf(value, ...params);
    }
    return undefined;
  }

  // "zero" | "one" | "two" | "few" | "many" | "other"
  public async getQuantityString(res: string, quantity: number, ...params: any[]): Promise<string | undefined> {
    const value = await this.getResourceValue("values", "strings.json", res);
    const quantityStr = this.pluralRules.select(quantity);
    if (value && hasOwnProperty(value, quantityStr)) {
      return sprintf(value[quantityStr], ...params);
    }
    return undefined;
  }

  public async getStringArray(res: string, idx: number, ...params: any[]): Promise<string | undefined> {
    const value = await this.getResourceValue("values", "strings.json", res);
    if (value && hasOwnProperty(value, idx)) {
      return sprintf(value[idx], ...params);
    }
    return undefined;
  }

  protected initBrowserInfo(): [string|undefined, number|undefined] {
      const ua = navigator.userAgent;
      let tem;
      let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      if (/trident/i.test(M[1])){
        tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
        return [
          'IE',
          parseInt(tem[1], 10) || undefined
        ];
      }
      if (M[1] === 'Chrome'){
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) {
          return [
            tem[1].replace('OPR', 'Opera'),
            parseInt(tem[2], 10) || undefined
          ];
        }
      }
      const arr = M[2] ? [M[1], M[2]]: [navigator.appName, navigator.appVersion];
      tem = ua.match(/version\/(\d+)/i);
      if (tem) arr.splice(1, 1, tem[1]);
      return [
        arr[0],
        parseInt(arr[1], 10) || undefined
      ];
  }

  protected updatePluralRules() {
    if (Intl && Intl.PluralRules && this.lang) {
      const lngReg = this.region ? `${this.region}-${this.lang}` : this.lang;
      this.pluralRules = new Intl.PluralRules(lngReg, {type: "ordinal"});
    } else {
      this.pluralRules = this.DEFAULT_PLURAL_RULES;
    }
  }
}
