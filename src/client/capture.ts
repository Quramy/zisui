import { ExposedWindow } from "../types";
import { ScreenShotOptions } from "./types";
import imagesloaded from "imagesloaded";

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

export function capture(opt: Partial<ScreenShotOptions> = { }) {
  if (typeof "window" === "undefined") return;
  const win = window as ExposedWindow;
  if (!win.emitCatpture) return;
  const scOpt = {
    ...defaultScreenshotOptions,
    ...opt,
  };
  const data = {
    ...scOpt,
    url: window.location.href,
  };
  return Promise.resolve()
  .then(() => waitImages(scOpt.waitImages))
  .then(() => waitUserFunction(scOpt.waitFor, win))
  .then(() => waitNextIdl(win))
  .then(() => win.emitCatpture(data));
}
