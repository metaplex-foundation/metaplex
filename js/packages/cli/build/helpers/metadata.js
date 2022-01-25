"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetadataFiles = exports.TRAITS_DIRECTORY = exports.ASSETS_DIRECTORY = void 0;
const fs_1 = __importDefault(require("fs"));
const loglevel_1 = __importDefault(require("loglevel"));
const lodash_1 = __importDefault(require("lodash"));
const various_1 = require("./various");
const { writeFile, mkdir } = fs_1.default.promises;
exports.ASSETS_DIRECTORY = './assets';
exports.TRAITS_DIRECTORY = './traits';
async function createMetadataFiles(numberOfImages, configLocation, treatAttributesAsFileNames) {
    let numberOfFilesCreated = 0;
    const randomizedSets = [];
    if (!fs_1.default.existsSync(exports.ASSETS_DIRECTORY)) {
        try {
            await mkdir(exports.ASSETS_DIRECTORY);
        }
        catch (err) {
            loglevel_1.default.error('unable to create assets directory', err);
        }
    }
    const { breakdown, name, symbol, creators, description, seller_fee_basis_points, collection, dnp, premadeCustoms, } = await (0, various_1.readJsonFile)(configLocation);
    while (numberOfFilesCreated < premadeCustoms.length) {
        randomizedSets.push(premadeCustoms[numberOfFilesCreated]);
        numberOfFilesCreated += 1;
    }
    while (numberOfFilesCreated < parseInt(numberOfImages, 10)) {
        const randomizedSet = (0, various_1.generateRandomSet)(breakdown, dnp);
        if (!lodash_1.default.some(randomizedSets, randomizedSet)) {
            randomizedSets.push(randomizedSet);
            numberOfFilesCreated += 1;
        }
    }
    const shuffled = (0, various_1.shuffle)(randomizedSets);
    for (let i = 0; i < shuffled.length; i++) {
        const metadata = (0, various_1.getMetadata)(name, symbol, i, creators, description, seller_fee_basis_points, shuffled[i], collection, treatAttributesAsFileNames);
        try {
            await writeFile(`${exports.ASSETS_DIRECTORY}/${i}.json`, JSON.stringify(metadata));
        }
        catch (err) {
            loglevel_1.default.error(`${numberOfFilesCreated} failed to get created`, err);
        }
    }
    // map through after because IDs would make sets unique
    const randomSetWithIds = shuffled.map((item, index) => ({
        id: index + 1,
        ...item,
    }));
    return randomSetWithIds;
}
exports.createMetadataFiles = createMetadataFiles;
