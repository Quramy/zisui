import addoons from "@storybook/addons";
import { ExposedWindow } from "../node/types";

addoons.register("zisui", api => {

  addoons.getChannel().once("setStories", e => {
    (window as ExposedWindow).stories = e.stories;
  });
});
