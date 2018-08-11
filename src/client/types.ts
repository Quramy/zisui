export type ScreenShotOptions = {
  waitImages: boolean,
  waitFor: string,
  viewPort: {
    width: number,
    height: number,
  },
  fullPage: boolean,
};

export type ScreenShotOptionsForApp = ScreenShotOptions & {
  url: string,
};
