import { StoryKind } from "@storybook/addons";
import { StorybookBrowser, PreviewBrowser } from "./browser";
import { execParalell, flattenStories, Story } from "../util";
import { MainOptions } from "./types";
import { StorybookServer } from "./server";
import { FileSystem } from "./file";

async function bootPreviewBrowsers(opt: MainOptions, stories: Story[]) {
  const browsers = new Array(Math.min(opt.parallel, stories.length)).fill("").map((_, i) => new PreviewBrowser(opt, i));
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

  let stories = flattenStories(await storybookBrowser.getStories()).map(s => ({ ...s, count: 0 }));
  storybookBrowser.close();

  while(stories.length > 0) {
    const browsers = await bootPreviewBrowsers(opt, stories);
    const tasks = stories
    .map(({ story, kind, count }) => {
      return async (previewBrowser: PreviewBrowser) => {
        await previewBrowser.setCurrentStory(kind, story, count );
        const { buffer } = await previewBrowser.screenshot();
        if (buffer) {
          await fileSystem.save(kind, story, buffer);
        }
      };
    });

    await execParalell(tasks, browsers);
    if (opt.showBrowser) break;
    await browsers.map(b => b.close());
    stories = browsers.reduce((acc, b) => [...acc, ...b.failedStories], [] as (Story & { count: number })[]);
  }

  if (!opt.showBrowser) storybookServer.shutdown();
}
