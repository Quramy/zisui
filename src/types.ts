import { StoryKind } from "@storybook/addons";
import { ScreenShotOptions } from "./client/types";

export type ExposedWindow = typeof window & {
  stories?: StoryKind[];
  setStories(stories: StoryKind[]): void;
  emitCatpture(opt: ScreenShotOptions): void;
};
