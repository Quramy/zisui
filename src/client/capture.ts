import { ExposedWindow } from "../types";
import { ScreenShotOptions } from "./types";

export function capture(opt: ScreenShotOptions = { }) {
  if (typeof "window" === "undefined") return;
  const win = window as ExposedWindow;
  if (!win.emitCatpture) return;
  console.log("capture!");
  const data = {
    ...opt,
    url: window.location.href,
  };
  win.emitCatpture(data);
}
