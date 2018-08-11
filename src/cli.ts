#!/usr/bin/env node

import { main } from "./main";
import { MainOptions } from "./types";
import yargs from "yargs";
import { Logger } from "./logger";

function createOptions(): MainOptions {
  const setting = yargs
    .usage("zisui storybook_url")
    .option("outDir", { string: true, alias: "o", default: "__screenshot__", description: "Output directory." })
    .option("parallel", { number: true, alias: "p", default: 4, description: "Number of browsers to screenshot." })
    .option("disableCssAnimation", { boolean: true, default: true, description: "Disable CSS animation and transition." })
    .option("silent", { boolean: true, default: false })
    .option("verbose", { boolean: true, default: false })
    .option("serverCmd", { string: true, default: "", description: "Command line to launch Storybook server." })
    .option("serverTimeout", { number: true, default: 20_000, description: "Timeout [msec] for starting Storybook server." })
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
    disableCssAnimation,
  } = setting.argv;

  const opt = {
    storybookUrl,
    outDir,
    parallel,
    serverCmd,
    serverTimeout,
    disableCssAnimation,
    logger: new Logger(verbose ? "verbose" : silent ? "silent" : "normal"),
  } as MainOptions;
  return opt;
}

const opt = createOptions();
main(opt)
.then()
.catch(err => {
  if (err instanceof Error) {
    opt.logger.error(err.message);
    opt.logger.errorStack(err.stack);
  } else {
    opt.logger.error(err);
  }
  process.exit(1);
});
