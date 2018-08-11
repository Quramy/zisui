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
import { ExposedWindow, MainOptions } from "./types";
import { ScreenShotOptions, ScreenShotOptionsForApp } from "./client/types";
import { ScreenshotTimeoutError, InvalidCurrentStoryStateError } from "./errors";
import { flattenStories, sleep } from "./util";

function url2story(url: string) {
  const q = parse(url).query || "";
  const { selectedKind: kind, selectedStory: story } = querystring.parse(q);
  if (!kind || Array.isArray(kind) || !story || Array.isArray(story)) return;
  return { kind, story };
}

export class Browser {
  private browser!: PuppeteerBrowser;
  protected page!: Page;

  constructor(protected opt: MainOptions) {
  }

  async boot() {
    // TODO args for CI
    this.browser = await launch();
    this.page = await this.browser.newPage();
    return this;
  }

  protected async openPage(url: string) {
    await this.page.goto(url);
  }

  async close() {
    try {
      await this.page.close();
      await sleep(50);
      await this.browser.close();
    } catch(e) {
      // nothing to do
    }
  }
}

export class StorybookBrowser extends Browser {
  async getStories() {
    this.opt.logger.debug("Wait for stories definition.");
    await this.openPage(this.opt.storybookUrl);
    const stories = await this.page.waitFor(() => (window as ExposedWindow).stories).then(x => x.jsonValue()) as StoryKind[];
    this.opt.logger.debug(stories);
    this.opt.logger.log(`Found ${this.opt.logger.color.green(flattenStories(stories).length + "")} stories.`);
    return stories;
  }
}

export class PreviewBrowser extends Browser {
  private emitter: EventEmitter;
  private currentStory?: { kind: string, story: string };
  private tempBuffer?: Buffer;

  constructor(mainOptions: MainOptions, private idx: number) {
    super(mainOptions);
    this.emitter = new EventEmitter();
    this.emitter.on("error", e => {
      throw e;
    });
  }

  async boot() {
    await super.boot();
    await this.expose();
    await this.openPage(this.opt.storybookUrl + "/iframe.html?selectedKind=zisui&selectedStory=zisui");
    return this;
  }

  private async expose() {
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
    this.opt.logger.debug(`[cid: ${this.idx}]`, "Set story", kind, story);
    await this.page.evaluate((d: typeof data) => window.postMessage(JSON.stringify(d), "*"), data);
  }

}
