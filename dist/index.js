#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fritzbox_1 = require("@seydx/fritzbox");
const log_update_1 = tslib_1.__importDefault(require("log-update"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const pretty_bytes_1 = tslib_1.__importDefault(require("pretty-bytes"));
const conf_1 = tslib_1.__importDefault(require("conf"));
const inquirer_1 = tslib_1.__importDefault(require("inquirer"));
let box;
let config;
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
    output.push(`${chalk_1.default.green("⬆︎")}  ${pretty_bytes_1.default(bandwidth.avgBpsUpstreamPerSecond, {
        bits: true,
    })}/sec.`);
    output.push(`${chalk_1.default.red("⬇︎")}  ${pretty_bytes_1.default(bandwidth.avgBpsDownstreamPerSecond, {
        bits: true,
    })}/sec.`);
    output.push(`${chalk_1.default.cyan("⥥")}  ${pretty_bytes_1.default(bandwidth.avgBpsMulticastPerSecond, {
        bits: true,
    })}/sec.`);
    return output.join("\n");
}
function loop() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const bandwidth = yield getBandwidth();
        log_update_1.default(render(bandwidth));
        setTimeout(loop, 5000);
    });
}
function getConfig() {
    const config = new conf_1.default();
    return {
        username: config.get("username", ""),
        password: config.get("password", ""),
    };
}
function askForConfiguration() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const newConfig = yield inquirer_1.default.prompt([
            { type: "value", message: "Username: ", name: "username" },
            { type: "password", message: "Password: ", name: "password" },
        ]);
        console.log("");
        const conf = new conf_1.default();
        conf.set(newConfig);
        config = newConfig;
    });
}
function login() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        box = new fritzbox_1.Fritzbox({
            username: config.username,
            password: config.password,
        });
        try {
            const info = yield box.exec("urn:dslforum-org:service:DeviceInfo:1", "GetInfo");
            const modelName = info["NewModelName"];
            console.log(`${chalk_1.default.yellow('■')}  Bandwidth (every 5s) of ${modelName}`);
            console.log("");
        }
        catch (e) {
            console.log(chalk_1.default.red("Error accessing fritz box:"), e.message);
            yield askForConfiguration();
            return login();
        }
    });
}
(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    config = getConfig();
    yield login();
    try {
        yield loop();
    }
    catch (e) {
        console.error(`FATAL ERROR: `, e);
    }
}))();
//# sourceMappingURL=index.js.map