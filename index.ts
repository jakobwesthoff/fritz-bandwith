#!/usr/bin/env node

import { Fritzbox } from "@seydx/fritzbox";
import logUpdate from "log-update";
import chalk from "chalk";
import prettyBytes from "pretty-bytes";
import Conf from "conf";
import inquirer from "inquirer";
import babar from 'babar';

interface Configuration {
  username: string;
  password: string;
}

interface Bandwidth {
  time: Date;
  bpsDownstream: number[];
  bpsUpstream: number[];
  bpsMulticast: number[];
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
    bpsDownstream: downstreamValues.map((value: string) => parseInt(value) * 8),
    bpsUpstream: upstreamValues.map((value: string) => parseInt(value) * 8),
    bpsMulticast: multicastValues.map((value: string) => parseInt(value) * 8),
  };
}

function render(bandwidth: Bandwidth): string {
  let status: string[] = [];

  status.push(
    `${chalk.green("⬆︎")}  ${prettyBytes(bandwidth.bpsUpstream[0], {
      bits: true,
    })}/sec.`
  );
  status.push(
    `${chalk.red("⬇︎")}  ${prettyBytes(bandwidth.bpsDownstream[0], {
      bits: true,
    })}/sec.`
  );
  status.push(
    `${chalk.cyan("⥥")}  ${prettyBytes(bandwidth.bpsMulticast[0], {
      bits: true,
    })}/sec.`
  );

  const historyUpstream = babar(bandwidth.bpsUpstream.map((value, index) => [index, value]), {color: 'green', height: 5});
  const historyDownstream = babar(bandwidth.bpsDownstream.map((value, index) => [index, value]), {color: 'red', height: 5});
  // const historyMulticast = babar(bandwidth.bpsMulticast.map((value, index) => [index, value]), {color: 'cyan', height: 5});

  return status.join("\n") + "\n\n" + historyUpstream + "\n\n" + historyDownstream + "\n" ;
}

async function loop() {
  const bandwidth = await getBandwidth();
  logUpdate(render(bandwidth));
  // console.log(render(bandwidth));
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
