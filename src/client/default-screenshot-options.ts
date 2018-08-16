import { ScreenShotOptions } from "./types";

export const defaultScreenshotOptions = {
  delay: 0,
  waitImages: true,
  waitFor: "",
  viewport: {
    width: 800,
    height: 600,
  },
  fullPage: true,
  skip: false,
} as ScreenShotOptions;
