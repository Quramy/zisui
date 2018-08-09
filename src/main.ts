import fs from "fs";
import path from "path";
import { Buffer } from "buffer";
import * as mkdirp from "mkdirp";
import { StorybookBrowser, PreviewBrowser } from "./browser";
import { execParalell } from "./util";

function save(outdir: string, kind: string, story: string, buffer: Buffer) {
  const filePath = path.join(outdir, kind, story + ".png");
  return new Promise((resolve, reject) => {
    mkdirp.sync(path.dirname(filePath));
    fs.writeFile(filePath, buffer, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

export async function main() {
  const storybookBrowser = new StorybookBrowser();
  await storybookBrowser.boot();
  const url1 = "http://localhost:9009";
  await storybookBrowser.openPage(url1);
  const stories = await storybookBrowser.getStories();
  storybookBrowser.close();

  console.log(stories);

  const previewBrowser = new PreviewBrowser();
  await previewBrowser.boot();
  await previewBrowser.expose();
  await previewBrowser.openPage(url1 + "/iframe.html?selectedKind=zisui&selectedStory=zisui");

  const browsers = [previewBrowser];

  const tasks = stories
    .reduce((acc, storyKind) => [...acc, ...storyKind.stories.map(story => ({ kind: storyKind.kind, story }))], [] as { story: string, kind: string}[])
    .map(({ story, kind }) => {
      return async (i: number) => {
        await browsers[i].setCurrentStory(kind, story);
        const { buffer } = await previewBrowser.screenshot();
        await save("__screenshot__", kind, story, buffer);
      };
    });

  await execParalell(tasks);

  browsers.map(b => b.close());
}
