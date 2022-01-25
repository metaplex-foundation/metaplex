"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfigurations = void 0;
const fs_1 = __importDefault(require("fs"));
const loglevel_1 = __importDefault(require("loglevel"));
const various_1 = require("../helpers/various");
const { readdir, writeFile } = fs_1.default.promises;
async function generateConfigurations(traits) {
    let generateSuccessful = true;
    const configs = {
        name: '',
        symbol: '',
        description: '',
        creators: [],
        dnp: {},
        premadeCustoms: [],
        collection: {},
        breakdown: {},
        order: traits,
        width: 1000,
        height: 1000,
    };
    try {
        await Promise.all(traits.map(async (trait) => {
            const attributes = await readdir(`./traits/${trait}`);
            const randoms = (0, various_1.generateRandoms)(attributes.length - 1);
            const tmp = {};
            attributes.forEach((attr, i) => {
                tmp[attr] = randoms[i];
            });
            configs['breakdown'][trait] = tmp;
        }));
    }
    catch (err) {
        generateSuccessful = false;
        loglevel_1.default.error('Error created configurations', err);
        throw err;
    }
    try {
        await writeFile('./traits-configuration.json', JSON.stringify(configs));
    }
    catch (err) {
        generateSuccessful = false;
        loglevel_1.default.error('Error writing configurations to configs.json', err);
        throw err;
    }
    return generateSuccessful;
}
exports.generateConfigurations = generateConfigurations;
