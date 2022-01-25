"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipfsUpload = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const ipfs_http_client_1 = require("ipfs-http-client");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function ipfsUpload(ipfsCredentials, image, manifestBuffer) {
    const tokenIfps = `${ipfsCredentials.projectId}:${ipfsCredentials.secretKey}`;
    // @ts-ignore
    const ipfs = (0, ipfs_http_client_1.create)('https://ipfs.infura.io:5001');
    const uploadToIpfs = async (source) => {
        const { cid } = await ipfs.add(source).catch();
        return cid;
    };
    const mediaHash = await uploadToIpfs((0, ipfs_http_client_1.globSource)(image, { recursive: true }));
    loglevel_1.default.debug('mediaHash:', mediaHash);
    const mediaUrl = `https://ipfs.io/ipfs/${mediaHash}`;
    loglevel_1.default.debug('mediaUrl:', mediaUrl);
    const authIFPS = Buffer.from(tokenIfps).toString('base64');
    await (0, node_fetch_1.default)(`https://ipfs.infura.io:5001/api/v0/pin/add?arg=${mediaHash}`, {
        headers: {
            Authorization: `Basic ${authIFPS}`,
        },
        method: 'POST',
    });
    loglevel_1.default.info('uploaded image for file:', image);
    await sleep(500);
    const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
    manifestJson.image = mediaUrl;
    manifestJson.properties.files = manifestJson.properties.files.map(f => {
        return { ...f, uri: mediaUrl };
    });
    const manifestHash = await uploadToIpfs(Buffer.from(JSON.stringify(manifestJson)));
    await (0, node_fetch_1.default)(`https://ipfs.infura.io:5001/api/v0/pin/add?arg=${manifestHash}`, {
        headers: {
            Authorization: `Basic ${authIFPS}`,
        },
        method: 'POST',
    });
    await sleep(500);
    const link = `https://ipfs.io/ipfs/${manifestHash}`;
    loglevel_1.default.info('uploaded manifest: ', link);
    return [link, mediaUrl];
}
exports.ipfsUpload = ipfsUpload;
