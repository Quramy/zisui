import addoons from "@storybook/addons";
import { ExposedWindow } from "../types";

addoons.register("zisui", api => {

  addoons.getChannel().once("setStories", e => {
    (window as ExposedWindow).stories = e.stories;
  });
});
