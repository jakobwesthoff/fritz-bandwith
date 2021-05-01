"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fritzbox_1 = require("@seydx/fritzbox");
const log_update_1 = tslib_1.__importDefault(require("log-update"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const pretty_bytes_1 = tslib_1.__importDefault(require("pretty-bytes"));
const USERNAME = "";
const PASSWORD = "";
let box;
// const sum = (...value: string[]): number =>
//   value.reduce((a, v) => a + parseInt(v), 0);
// const avg = (...value: string[]): number => sum(...value) / value.length;
function getBandwidth() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const info = yield box.exec("urn:WANCIfConfig-com:serviceId:WANCommonInterfaceConfig1", "X_AVM-DE_GetOnlineMonitor", { NewSyncGroupIndex: 0 });
        const downstreamValues = info["Newds_current_bps"].split(",");
        const upstreamValues = info["Newus_current_bps"].split(",");
        const multicastValues = info["Newmc_current_bps"].split(",");
        return {
            time: new Date(),
            avgBpsDownstreamPerSecond: parseInt(downstreamValues[0]) * 8,
            avgBpsUpstreamPerSecond: parseInt(upstreamValues[0]) * 8,
            avgBpsMulticastPerSecond: parseInt(multicastValues[0]) * 8,
        };
    });
}
function render(bandwidth) {
    let output = [];
    output.push(`${chalk_1.default.green("⬆︎")}  ${pretty_bytes_1.default(bandwidth.avgBpsUpstreamPerSecond, { bits: true })}/sec.`);
    output.push(`${chalk_1.default.yellow("⬇︎")}  ${pretty_bytes_1.default(bandwidth.avgBpsDownstreamPerSecond, { bits: true })}/sec.`);
    output.push(`${chalk_1.default.cyan("⥥")}  ${pretty_bytes_1.default(bandwidth.avgBpsMulticastPerSecond, { bits: true })}/sec.`);
    return output.join("\n");
}
function loop() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const bandwidth = yield getBandwidth();
        log_update_1.default(render(bandwidth));
        setTimeout(loop, 5000);
    });
}
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        box = new fritzbox_1.Fritzbox({
            username: USERNAME,
            password: PASSWORD,
        });
        yield loop();
    }
    catch (e) {
        console.error(`FATAL ERROR: `, e);
    }
}))();
//# sourceMappingURL=index.js.map