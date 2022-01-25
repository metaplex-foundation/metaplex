"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCache = exports.loadCache = exports.cachePath = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("./constants");
function cachePath(env, cacheName, cPath = constants_1.CACHE_PATH, legacy = false) {
    const filename = `${env}-${cacheName}`;
    return path_1.default.join(cPath, legacy ? filename : `${filename}.json`);
}
exports.cachePath = cachePath;
function loadCache(cacheName, env, cPath = constants_1.CACHE_PATH, legacy = false) {
    const path = cachePath(env, cacheName, cPath, legacy);
    if (!fs_1.default.existsSync(path)) {
        if (!legacy) {
            return loadCache(cacheName, env, cPath, true);
        }
        return undefined;
    }
    return JSON.parse(fs_1.default.readFileSync(path).toString());
}
exports.loadCache = loadCache;
function saveCache(cacheName, env, cacheContent, cPath = constants_1.CACHE_PATH) {
    cacheContent.env = env;
    cacheContent.cacheName = cacheName;
    fs_1.default.writeFileSync(cachePath(env, cacheName, cPath), JSON.stringify(cacheContent));
}
exports.saveCache = saveCache;
