#!/usr/bin/env node

import { main } from "./main";
import { MainOptions } from "./types";
import yargs from "yargs";
import { Logger } from "./logger";

function createOptions(): MainOptions {
  const setting = yargs
    .locale("en")
    .wrap(120)
    .usage("usage: zisui [options] storybook_url")
    .option("outDir", { string: true, alias: "o", default: "__screenshots__", description: "Output directory." })
    .option("parallel", { number: true, alias: "p", default: 4, description: "Number of browsers to screenshot." })
    .option("disableCssAnimation", { boolean: true, default: true, description: "Disable CSS animation and transition." })
    .option("silent", { boolean: true, default: false })
    .option("verbose", { boolean: true, default: false })
    .option("serverCmd", { string: true, default: "", description: "Command line to launch Storybook server." })
    .option("serverTimeout", { number: true, default: 20_000, description: "Timeout [msec] for starting Storybook server." })
    .option("captureTimeout", { number: true, default: 5_000, description: "Timeout [msec] for capture a story." })
    .option("captureMaxRetryCount", { number: true, default: 3, description: "Number to retry to capture." })
    .option("viewportDelay", { number: true, default: 300, description: "Delay time [msec] between changing viewport and capturing." })
    .option("reloadAfterChangeViewport", { boolean: true, default: false, description: "Whether to reload after viewport changed." })
    .example("zisui http://localshot:9009", "")
    .example("zisui --serverCmd \"start-storybook -p 3000\" http://localshot:3000", "")
  ;
  let storybookUrl;

  if (!setting.argv._.length) {
    storybookUrl = "http://localhost:9001";
  } else {
    storybookUrl = setting.argv._[0];
  }

  const {
    outDir,
    parallel,
    silent,
    verbose,
    serverTimeout,
    serverCmd,
    captureTimeout,
    captureMaxRetryCount,
    viewportDelay,
    reloadAfterChangeViewport,
    disableCssAnimation,
  } = setting.argv;

  const opt = {
    storybookUrl,
    outDir,
    parallel,
    serverCmd,
    serverTimeout,
    captureTimeout,
    captureMaxRetryCount,
    viewportDelay,
    reloadAfterChangeViewport,
    disableCssAnimation,
    logger: new Logger(verbose ? "verbose" : silent ? "silent" : "normal"),
  } as MainOptions;
  return opt;
}

const start = Date.now();
const opt = createOptions();
main(opt)
.then(() => {
  const duration = Date.now() - start;
  opt.logger.log(`Screenshot was ended successfully in ${opt.logger.color.green(duration + " msec")}.`);
})
.catch(err => {
  if (err instanceof Error) {
    opt.logger.error(err.message);
    opt.logger.errorStack(err.stack);
  } else {
    opt.logger.error(err);
  }
  process.exit(1);
});
