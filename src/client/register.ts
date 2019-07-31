import addoons from "@storybook/addons";
import { ExposedWindow } from "../node/types";

(window as any).__ZISUI_REGISTERED__ = true;

addoons.register("zisui", () => {
  addoons.getChannel().once("setStories", e => {
    (window as ExposedWindow).stories = e.stories;
  });
});
