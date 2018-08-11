import { StoryKind } from "@storybook/addons";
import { ScreenShotOptions } from "./client/types";
import { Logger } from "./logger";
import { Story } from "./util";

export type ExposedWindow = typeof window & {
  stories?: StoryKind[],
  emitCatpture(opt: ScreenShotOptions): void,
  waitFor?: () => Promise<any>,
  requestIdleCallback(cb: Function, opt?: { timeout: number }): void,
  getCurrentStory: (url: string) => Promise<Story | undefined>,
  optionStore?: { [kind: string]: { [story: string]: (Partial<ScreenShotOptions>)[] } },
};

export interface MainOptions {
  storybookUrl: string;
  serverCmd: string;
  serverTimeout: number;
  outDir: string;
  disableCssAnimation: boolean;
  parallel: number;
  logger: Logger;
}
