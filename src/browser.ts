import { StoryKind } from "@storybook/addons";
import { Buffer } from "buffer";
import { EventEmitter } from "events";
import { parse } from "url";
import querystring from "querystring";
import {
  launch,
  Browser as PuppeteerBrowser,
  Page,
  Viewport,
} from "puppeteer";

import { ExposedWindow, MainOptions } from "./types";
import { ScreenShotOptions, ScreenShotOptionsForApp } from "./client/types";
import { ScreenshotTimeoutError, InvalidCurrentStoryStateError } from "./errors";
import { flattenStories, sleep, Story } from "./util";
const dd = require("puppeteer/DeviceDescriptors") as { name: string, viewport: Viewport }[];

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
    this.browser = await launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"], headless: true });
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
  failedStories: (Story & { count: number })[] = [];
  private viewport?: Viewport;
  private emitter: EventEmitter;
  private currentStory?: { kind: string, story: string, count: number };
  private processedStories: { [key: string]: Story} = { };
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
    await this.addStyles();
    await this.openPage(this.opt.storybookUrl + "/iframe.html?selectedKind=zisui&selectedStory=zisui");
    await this.addStyles();
    return this;
  }

  private async addStyles() {
    if (this.opt.disableCssAnimation) {
      await this.page.addStyleTag({
        content: `
*, *::before, *::after {
  transition: none !important;
  animation: none !important;
}
        `,
      });
      await this.page.addScriptTag({
        content: `
const $doc = document;
const $style = $doc.createElement('style');
$style.innerHTML = "body *, body *::before, body *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }";
$doc.body.appendChild($style);
        `
      });
    }
  }

  private async expose() {
    this.page.exposeFunction("emitCatpture", (opt: any) => this.screenshotCallback(opt));
    this.page.exposeFunction("getCurrentStory", (url: string) => url2story(url));
  }

  async screenshotCallback(opt: ScreenShotOptionsForApp) {
    if (!this.currentStory) {
      this.emitter.emit("error", new InvalidCurrentStoryStateError());
      return;
    }
    if (this.processedStories[this.currentStory.kind + this.currentStory.story]) {
      this.opt.logger.debug(`[cid: ${this.idx}]`, "This story was already processed:", this.currentStory.kind, this.currentStory.story, JSON.stringify(opt));
      return;
    }
    this.processedStories[this.currentStory.kind + this.currentStory.story] = this.currentStory;
    this.opt.logger.debug(`[cid: ${this.idx}]`, "Start to process to screenshot story:", this.currentStory.kind, this.currentStory.story, JSON.stringify(opt));
    this.emitter.emit("screenshot", opt);
    const buffer = await this.page.screenshot({ fullPage: opt.fullPage });
  }

  private waitScreenShotOption() {
    return new Promise<ScreenShotOptions | undefined>((resolve, reject) => {
      let id: NodeJS.Timer;
      const cb = (opt?: ScreenShotOptions) => {
        resolve(opt);
        this.emitter.removeAllListeners();
        clearTimeout(id);
      };
      id = setTimeout(() => {
        this.emitter.removeAllListeners();
        if (!this.currentStory) {
          reject(new InvalidCurrentStoryStateError());
          return;
        }
        if (this.currentStory.count < this.opt.captureMaxRetryCount) {
          this.opt.logger.warn(`Capture timeout exceeded in ${this.opt.captureTimeout + ""} msec. Retry to screenshot this story after this sequence.`, this.currentStory.kind, this.currentStory.story, this.currentStory.count + 1);
          this.failedStories.push({ ...this.currentStory, count: this.currentStory.count + 1 });
          resolve();
          return;
        }
        reject(new ScreenshotTimeoutError(this.opt.captureTimeout, this.currentStory));
      }, this.opt.captureTimeout);
      this.emitter.once("screenshot", cb);
      this.emitter.once("skip", cb);
    });
  }

  private async setViewport(opt: ScreenShotOptions) {
    if (!this.currentStory) {
      throw new InvalidCurrentStoryStateError();
    }
    let nextViewport: Viewport;
    if (typeof opt.viewport === "string") {
      const hit = dd.find(d => d.name === opt.viewport);
      if (!hit) {
        this.opt.logger.warn(`Skip screenshot for ${this.opt.logger.color.yellow(JSON.stringify(this.currentStory))} because the viewport ${this.opt.logger.color.magenta(opt.viewport)} is not registered in 'puppeteer/DeviceDescriptor'.`);
        return false;
      }
      nextViewport = hit.viewport;
    } else {
      nextViewport = opt.viewport;
    }
    if (!this.viewport || JSON.stringify(this.viewport) !== JSON.stringify(nextViewport)) {
      this.opt.logger.debug(`[cid: ${this.idx}]`, "Change viewport", JSON.stringify(nextViewport));
      await this.page.setViewport(nextViewport);
      this.viewport = nextViewport;
      if (this.opt.reloadAfterChangeViewport) {
        delete this.processedStories[this.currentStory.kind + this.currentStory.story];
        await Promise.all([this.page.reload(), this.waitScreenShotOption()]);
      }
    }
    return true;
  }

  async screenshot() {
    const opt = await this.waitScreenShotOption();
    if (!this.currentStory) {
      throw new InvalidCurrentStoryStateError();
    }
    if (!opt) {
      return { ...this.currentStory, buffer: null };
    }

    const succeeded = await this.setViewport(opt);
    if (!succeeded) return { ...this.currentStory, buffer: null };
    const buffer = await this.page.screenshot({ fullPage: opt.fullPage });
    return { ...this.currentStory, buffer };
  }

  async setCurrentStory(kind: string, story: string, count: number ) {
    this.currentStory = { kind, story, count };
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
