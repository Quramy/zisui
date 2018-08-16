import { StoryKind } from "@storybook/addons";
import { StorybookBrowser, PreviewBrowser } from "./browser";
import { execParalell, flattenStories, Story, filterStories } from "../util";
import { MainOptions, ZisuiRunMode } from "./types";
import { StorybookServer } from "./server";
import { FileSystem } from "./file";

async function bootPreviewBrowsers(opt: MainOptions, stories: Story[], mode: ZisuiRunMode) {
  const browsers = new Array(Math.min(opt.parallel, stories.length)).fill("").map((_, i) => new PreviewBrowser(opt, mode, i));
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

  const result = await storybookBrowser.getStories();
  const mode: ZisuiRunMode = result.managed ? "managed" : "simple";
  let stories = filterStories(flattenStories(result.stories), opt.include, opt.exclude).map(s => ({ ...s, count: 0 }));
  opt.logger.debug(`zisui runs with ${mode} mode`);
  storybookBrowser.close();

  if (stories.length === 0) {
    opt.logger.warn("There is no matched story. Check your include/exclude options.");
  }

  while(stories.length > 0) {
    const browsers = await bootPreviewBrowsers(opt, stories, mode);
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
