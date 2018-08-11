import { ExposedWindow } from "../types";
import { ScreenShotOptions } from "./types";
import imagesloaded from "imagesloaded";
import { Story } from "../util";

const defaultScreenshotOptions = {
  waitImages: true,
  waitFor: "",
  viewPort: {
    width: 800,
    height: 600,
  },
  fullPage: true,
} as ScreenShotOptions;

function waitImages(enabled: boolean, selector = "body") {
  if (!enabled) return Promise.resolve();
  const elm = document.querySelector(selector);
  if (!elm) return Promise.reject();
  return new Promise<void>(res => imagesloaded(elm, () => res()));
}

function waitUserFunction(waitFor: string, win: ExposedWindow) {
  if (!waitFor) return Promise.resolve();
  if (!win.waitFor || typeof win.waitFor !== "function") return Promise.resolve();
  return win.waitFor();
}

function waitNextIdl(win: ExposedWindow) {
  return new Promise(res => win.requestIdleCallback(() => res(), { timeout: 3000 }));
}

function pushOptions(win: ExposedWindow, s: Story | undefined, opt: Partial<ScreenShotOptions>) {
  if (!s) return;
  const { story, kind } = s;
  if (!win.optionStore) win.optionStore = { };
  if (!win.optionStore[kind]) win.optionStore[kind] = { };
  if (!win.optionStore[kind][story]) win.optionStore[kind][story] = [];
  win.optionStore[kind][story].push(opt);
}

function consumeOptions(win: ExposedWindow, s: Story | undefined): Partial<ScreenShotOptions>[] | null {
  if (!s) return null;
  const { story, kind } = s;
  if (!win.optionStore) return null;
  if (!win.optionStore[kind]) return null;
  if (!win.optionStore[kind][story]) return null;
  const result = win.optionStore[kind][story];
  delete win.optionStore[kind][story];
  return result;
}

function withExpoesdWindow(cb: (win: ExposedWindow) => any) {
  if (typeof "window" === "undefined") return;
  const win = window as ExposedWindow;
  if (!win.emitCatpture) return;
  return cb(win);
}

export function stock(opt: Partial<ScreenShotOptions> = { }) {
  withExpoesdWindow(win => {
    win.getCurrentStory(location.href).then(s => pushOptions(win, s, opt));
  });
}

export function capture() {
  withExpoesdWindow(win => {
    win.getCurrentStory(location.href).then(s => {
      if (!s) return;
      const options = consumeOptions(win, s);
      if (!options) return;
      const scOpt = options.reduce((acc: ScreenShotOptions, opt: Partial<ScreenShotOptions>) => ({ ...acc, ...opt }), defaultScreenshotOptions);
      Promise.resolve()
        .then(() => waitImages(scOpt.waitImages))
        .then(() => waitUserFunction(scOpt.waitFor, win))
        .then(() => waitNextIdl(win))
        .then(() => win.emitCatpture(scOpt));
    });
  });
}
