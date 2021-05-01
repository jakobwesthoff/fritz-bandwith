import { Fritzbox } from "@seydx/fritzbox";
import logUpdate from "log-update";
import chalk from "chalk";
import prettyBytes from "pretty-bytes";

const USERNAME="";
const PASSWORD="";

interface Bandwidth {
  time: Date;
  avgBpsDownstreamPerSecond: number;
  avgBpsUpstreamPerSecond: number;
  avgBpsMulticastPerSecond: number;
}

let box: Fritzbox;

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
    `${chalk.green( "⬆︎")}  ${prettyBytes(bandwidth.avgBpsUpstreamPerSecond, { bits: true })}/sec.`
  );
  output.push(
    `${chalk.yellow(
      "⬇︎"
    )}  ${prettyBytes(bandwidth.avgBpsDownstreamPerSecond, { bits: true})}/sec.`
  );
  output.push(
    `${chalk.cyan(
      "⥥"
    )}  ${prettyBytes(bandwidth.avgBpsMulticastPerSecond, { bits: true})}/sec.`
  );

  return output.join("\n");
}

async function loop() {
  const bandwidth = await getBandwidth();
  logUpdate(render(bandwidth));
  setTimeout(loop, 5000);
}

(async () => {
  try {
    box = new Fritzbox({
      username: USERNAME,
      password: PASSWORD,
    });

    await loop();
  } catch (e) {
    console.error(`FATAL ERROR: `, e);
  }
})();
