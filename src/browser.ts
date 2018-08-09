import { StoryKind } from "@storybook/addons";
import { Buffer } from "buffer";
import { EventEmitter } from "events";
import { parse } from "url";
import querystring from "querystring";
import {
  launch,
  Browser as PuppeteerBrowser,
  Page,
} from "puppeteer";
import { ExposedWindow } from "./types";
import { ScreenShotOptions, ScreenShotOptionsForApp } from "./client/types";
import { ScreenshotTimeoutError, InvalidCurrentStoryStateError } from "./errors";

export class Browser {
  private browser!: PuppeteerBrowser;
  protected page!: Page;

  constructor() {
  }

  async boot() {
    // TODO args for CI
    this.browser = await launch();
    this.page = await this.browser.newPage();
  }

  async openPage(url: string) {
    await this.page.goto(url);
  }

  async close() {
    try {
      await this.page.close();
      await this.browser.close();
    } catch(e) {
      // nothing to do
    }
  }
}

export class StorybookBrowser extends Browser {
  async getStories() {
    const stories = await this.page.waitFor(() => (window as ExposedWindow).stories).then(x => x.jsonValue()) as StoryKind[];
    return stories;
  }
}

function url2story(url: string) {
  const q = parse(url).query || "";
  const { selectedKind: kind, selectedStory: story } = querystring.parse(q);
  if (!kind || Array.isArray(kind) || !story || Array.isArray(story)) return;
  return { kind, story };
}

export class PreviewBrowser extends Browser {
  private emitter: EventEmitter;
  private currentStory?: { kind: string, story: string };
  private tempBuffer?: Buffer;

  constructor() {
    super();
    this.emitter = new EventEmitter();
    this.emitter.on("error", e => {
      throw e;
    });
  }

  async expose() {
    this.page.exposeFunction("emitCatpture", (opt: any) => this.screenshotCallback(opt));
  }

  async screenshotCallback(opt: ScreenShotOptionsForApp) {
    if (!this.currentStory) {
      this.emitter.emit("error", new InvalidCurrentStoryStateError());
    } else {
      const buffer = await this.page.screenshot();
      this.emitter.emit("screenshot", buffer);
    }
  }

  screenshot() {
    return new Promise<Buffer>((resolve, reject) => {
      let id: NodeJS.Timer;
      const cb = (buffer: Buffer) => {
        resolve(buffer);
        clearTimeout(id);
      };
      id = setTimeout(() => {
        this.emitter.removeListener("screenshot", cb);
        reject(new ScreenshotTimeoutError(20000, this.currentStory || { }));
      }, 20000);
      this.emitter.once("screenshot", cb);
    }).then(buffer => {
      if (!this.currentStory) {
        throw new Error("Fail to screenshot. The current story is not set");
      }
      return {
        ...this.currentStory,
        buffer,
      };
    });
  }

  async setCurrentStory(kind: string, story: string) {
    this.currentStory = { kind, story };
    console.log(this.page.url());
    const data = {
      key: "storybook-channel",
      event: {
        type: "setCurrentStory",
        args: [
          {
            kind,
            story,
          },
        ],
        from: "zisui",
      }
    };
    await this.page.evaluate((d: typeof data) => window.postMessage(JSON.stringify(d), "*"), data);
  }

}
