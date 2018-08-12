import { StoryKind } from "@storybook/addons";
import { StorybookBrowser, PreviewBrowser } from "./browser";
import { execParalell, flattenStories } from "./util";
import { MainOptions } from "./types";
import { StorybookServer } from "./server";
import { FileSystem } from "./file";

async function bootPreviewBrowsers(opt: MainOptions, stories: StoryKind[]) {
  const browsers = new Array(Math.min(opt.parallel, flattenStories(stories).length)).fill("").map((_, i) => new PreviewBrowser(opt, i));
  await browsers[0].boot();
  await Promise.all(browsers.slice(1, browsers.length).map(b => b.boot()));
  opt.logger.debug(`Started ${browsers.length} preview browsers`);
  return browsers;
}

export async function main(opt: MainOptions) {
  const logger = opt.logger;
  const fileSystem = new FileSystem(opt);
  const storybookServer = new StorybookServer(opt);
  const storybookBrowser = new StorybookBrowser(opt);

  await storybookServer.launchIfNeeded();
  await storybookBrowser.boot();

  const stories = await storybookBrowser.getStories();
  storybookBrowser.close();

  const browsers = await bootPreviewBrowsers(opt, stories);

  const tasks = flattenStories(stories)
    .map(({ story, kind }) => {
      return async (previewBrowser: PreviewBrowser) => {
        await previewBrowser.setCurrentStory(kind, story);
        const { buffer } = await previewBrowser.screenshot();
        if (buffer) {
          await fileSystem.save(kind, story, buffer);
        }
      };
    });

  await execParalell(tasks, browsers);

  browsers.map(b => b.close());
  storybookServer.shutdown();
}
