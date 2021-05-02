#!/usr/bin/env node

import { Fritzbox } from "@seydx/fritzbox";
import logUpdate from "log-update";
import chalk from "chalk";
import prettyBytes from "pretty-bytes";
import Conf from "conf";
import inquirer from "inquirer";

interface Configuration {
  username: string;
  password: string;
}

interface Bandwidth {
  time: Date;
  avgBpsDownstreamPerSecond: number;
  avgBpsUpstreamPerSecond: number;
  avgBpsMulticastPerSecond: number;
}

let box: Fritzbox;
let config: Configuration;

// const sum = (...value: string[]): number =>
//   value.reduce((a, v) => a + parseInt(v), 0);
// const avg = (...value: string[]): number => sum(...value) / value.length;

async function getBandwidth(): Promise<Bandwidth> {
  const info = await box.exec(
    "urn:WANCIfConfig-com:serviceId:WANCommonInterfaceConfig1",
    "X_AVM-DE_GetOnlineMonitor",
    { NewSyncGroupIndex: 0 }
  );
  const downstreamValues = info["Newds_current_bps"].split(",");
  const upstreamValues = info["Newus_current_bps"].split(",");
  const multicastValues = info["Newmc_current_bps"].split(",");

  return {
    time: new Date(),
    avgBpsDownstreamPerSecond: parseInt(downstreamValues[0]) * 8,
    avgBpsUpstreamPerSecond: parseInt(upstreamValues[0]) * 8,
    avgBpsMulticastPerSecond: parseInt(multicastValues[0]) * 8,
  };
}

function render(bandwidth: Bandwidth): string {
  let output: string[] = [];

  output.push(
    `${chalk.green("⬆︎")}  ${prettyBytes(bandwidth.avgBpsUpstreamPerSecond, {
      bits: true,
    })}/sec.`
  );
  output.push(
    `${chalk.red("⬇︎")}  ${prettyBytes(bandwidth.avgBpsDownstreamPerSecond, {
      bits: true,
    })}/sec.`
  );
  output.push(
    `${chalk.cyan("⥥")}  ${prettyBytes(bandwidth.avgBpsMulticastPerSecond, {
      bits: true,
    })}/sec.`
  );

  return output.join("\n");
}

async function loop() {
  const bandwidth = await getBandwidth();
  logUpdate(render(bandwidth));
  setTimeout(loop, 5000);
}

function getConfig(): Configuration {
  const config = new Conf<Configuration>();
  return {
    username: config.get("username", ""),
    password: config.get("password", ""),
  };
}

async function askForConfiguration(): Promise<void> {
  const newConfig = await inquirer.prompt<Configuration>([
    { type: "value", message: "Username: ", name: "username" },
    { type: "password", message: "Password: ", name: "password" },
  ]);
  console.log("");

  const conf = new Conf<Configuration>();
  conf.set(newConfig);
  config = newConfig;
}

async function login(): Promise<void> {
  box = new Fritzbox({
    username: config.username,
    password: config.password,
  });

  try {
    const info = await box.exec(
      "urn:dslforum-org:service:DeviceInfo:1",
      "GetInfo"
    );
    const modelName = info["NewModelName"];
    console.log(`${chalk.yellow('■')}  Bandwidth (every 5s) of ${modelName}`);
    console.log("");
  } catch (e) {
    console.log(chalk.red("Error accessing fritz box:"), e.message);
    await askForConfiguration();
    return login();
  }
}

(async () => {
  config = getConfig();
  await login();

  try {
    await loop();
  } catch (e) {
    console.error(`FATAL ERROR: `, e);
  }
})();
