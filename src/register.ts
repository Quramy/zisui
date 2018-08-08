import addoons from "@storybook/addons";

addoons.register("zisui", api => {

  addoons.getChannel().once("setStories", e => {
    console.log(e.stories);
  });
});
