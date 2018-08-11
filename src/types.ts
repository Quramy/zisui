import { StoryKind } from "@storybook/addons";
import { ScreenShotOptions } from "./client/types";
import { Logger } from "./logger";

export type ExposedWindow = typeof window & {
  stories?: StoryKind[];
  setStories(stories: StoryKind[]): void;
  emitCatpture(opt: ScreenShotOptions): void;
};

export interface MainOptions {
  storybookUrl: string;
  serverCmd: string;
  serverTimeout: number;
  outDir: string;
  parallel: number;
  logger: Logger;
}
