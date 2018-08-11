import * as cp from "child_process";
import waitOn = require("wait-on");
import { MainOptions } from "./types";
import { StorybookServerTimeoutError } from "./errors";

function waitServer(url: string, timeout: number) {
  const resource = url.replace(/^http/, "http-get");
  return new Promise((resolve, reject) => {
    waitOn({ resources: [resource], timeout }, (err) => {
      if (err) {
        if (err.message === "Timeout") {
          return reject(new StorybookServerTimeoutError(timeout));
        }
        return reject(err);
      }
      resolve();
    });
  });
}

export class StorybookServer {
  private proc?: cp.ChildProcess;
  constructor(private opt: MainOptions) {
  }

  async launchIfNeeded() {
    this.opt.logger.log("Wait for starting storybook server,", this.opt.storybookUrl);
    if (this.opt.serverCmd) {
      const [cmd, ...args] = this.opt.serverCmd.split(/\s+/);
      const stdio = this.opt.logger.level !== "silent" ? [0, 1, 2]: [];
      this.proc = cp.spawn(cmd, args, { stdio });
      this.opt.logger.debug("Server process created", this.proc.pid);
    }
    await waitServer(this.opt.storybookUrl, this.opt.serverTimeout);
    this.opt.logger.debug("Storybook server started");
  }

  async shutdown() {
    if (!this.proc) return;
    try {
      this.opt.logger.debug("Shutdown storybook server", this.proc.pid);
      this.proc.kill("SIGINT");
    } catch (e) {
      // nothing todo
    }
  }
}
