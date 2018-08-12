export type ScreenShotOptions = {
  waitImages: boolean,
  waitFor: string,
  viewport: {
    width: number,
    height: number,
    deviceScaleFactor?: number,
    isMobile?: boolean,
    hasTouch?: boolean,
    isLandscape?: boolean,
  } | string,
  fullPage: boolean,
};

export type ScreenShotOptionsForApp = ScreenShotOptions & {
  url: string,
};
