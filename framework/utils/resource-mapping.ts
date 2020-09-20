export const RESOURCE_VERSION: number = 1;

export type ResourceFile = {
  version: typeof RESOURCE_VERSION,
  drawable: {[name: string]: EntityPaths},
  values: {[name: string]: EntityPaths},
};

export type EntityPaths = {
  defPath?: string | undefined,
  nextConstraint?: string | undefined,
  subPaths?: { [constraintValue: string]: EntityPaths } | undefined;
}

export enum Constraints {
  LANG,
  REGION,
  LAYOUT_DIRECTION,
  WIDTH,
  HEIGHT,
  SCREEN_SIZE,
  SCREEN_ASPECT,
  SCREEN_ORIENTATION,
  NIGHT_MODE,
  IS_TOUCH,

  BROWSER_NAME,
  BROWSER_VERSION
}

export const CONSTRAINT_REGEX: {[key in Constraints]: RegExp} = {
  [Constraints.LANG]: /^[a-z]{2}$/,
  [Constraints.REGION]: /^[A-Z]{2}$/,
  [Constraints.LAYOUT_DIRECTION]: /^(rtl|ltr)$/,
  [Constraints.WIDTH]: /^[0-9]+w$/,
  [Constraints.HEIGHT]: /^[0-9]+h$/,
  [Constraints.SCREEN_SIZE]: /^(small|normal|large|xlarge)$/,
  [Constraints.SCREEN_ASPECT]: /^(not)?long$/,
  [Constraints.SCREEN_ORIENTATION]: /^(port|land)$/,
  [Constraints.NIGHT_MODE]: /^(not)?night$/,
  [Constraints.IS_TOUCH]: /^(not)?touch$/,
  [Constraints.BROWSER_NAME]: /^[a-zA-Z0-9- ]+$/,
  [Constraints.BROWSER_VERSION]: /^[0-9]*$/,
};

function* includesGenerator(curr: string, available: string[]) {
  if (available.includes(curr)) yield curr;
}

function* nearestLowNumGenerator(curr: string, available: string[]) {
  const currNum = Number(curr) || 0;
  const currArr = available
    .map(x => [x, Number(x)] as [string, number])
    .filter((x) => !isNaN(x[1]) && currNum > x[1])
    .sort((a, b) => b[1] - a[1]);
  for (let elem of currArr) {
    yield elem[0];
  }
}

function* screenSizeGenerator(curr: string, available: string[]) {
  let start = false;
  for (let i = ORDERED_SCREEN_SIZES.length - 1; i >= 0; i--) {
    const val = ORDERED_SCREEN_SIZES[i];
    if (val === curr) start = true;
    if (start && available.includes(val)) yield val;
  }
}

export const CONSTRAINT_GENERATORS: {[key in Constraints]: (curr: string, available: string[]) => Generator<string>} = {
  [Constraints.LANG]: includesGenerator,
  [Constraints.REGION]: includesGenerator,
  [Constraints.LAYOUT_DIRECTION]: includesGenerator,
  [Constraints.WIDTH]: nearestLowNumGenerator,
  [Constraints.HEIGHT]: nearestLowNumGenerator,
  [Constraints.SCREEN_SIZE]: screenSizeGenerator,
  [Constraints.SCREEN_ASPECT]: includesGenerator,
  [Constraints.SCREEN_ORIENTATION]: includesGenerator,
  [Constraints.NIGHT_MODE]: includesGenerator,
  [Constraints.IS_TOUCH]: includesGenerator,
  [Constraints.BROWSER_NAME]: includesGenerator,
  [Constraints.BROWSER_VERSION]: nearestLowNumGenerator,
}

const ORDERED_SCREEN_SIZES: SCREEN_SIZE[] = ["small", "normal", "large", "xlarge"];
export type SCREEN_SIZE = "small"|"normal"|"large"|"xlarge";
export type ASPECT_RATIO = "long"|"notlong";
export type SCREEN_ORIENTATION = "port"|"land";
export type LAYOUT_DIRECTION = "ltr"|"rtl";
export type NIGHT_MODE = "night"|"notnight";
export type TOUCH_MODE = "touch"|"nottouch";
