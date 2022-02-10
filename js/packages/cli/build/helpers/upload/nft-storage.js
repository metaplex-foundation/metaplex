"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftStorageUpload = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function nftStorageUpload(nftStorageKey, image, animation, manifestBuffer) {
    async function uploadMedia(media) {
        const stats = fs_1.default.statSync(media);
        const readStream = fs_1.default.createReadStream(media);
        loglevel_1.default.info(`Media Upload ${media}`);
        return (0, node_fetch_1.default)('https://api.nft.storage/upload', {
            method: 'POST',
            headers: {
                'Content-length': stats.size,
                Authorization: `Bearer ${nftStorageKey}`,
            },
            body: readStream, // Here, stringContent or bufferContent would also work
        })
            .then(response => response.json())
            .then(mediaUploadResponse => {
            const mediaURL = `https://${mediaUploadResponse.value.cid}.ipfs.dweb.link`;
            return mediaURL;
        })
            .catch(error => {
            loglevel_1.default.debug(error);
            throw new Error(`Media Upload Error: ${error}`);
        });
    }
    // Copied from ipfsUpload
    const imageUrl = `${await uploadMedia(image)}?ext=${path_1.default
        .extname(image)
        .replace('.', '')}`;
    const animationUrl = animation
        ? `${await uploadMedia(animation)}?ext=${path_1.default
            .extname(animation)
            .replace('.', '')}`
        : undefined;
    const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
    manifestJson.image = imageUrl;
    if (animation) {
        manifestJson.animation_url = animationUrl;
    }
    manifestJson.properties.files = manifestJson.properties.files.map(f => {
        if (f.type.startsWith('image/')) {
            return { ...f, uri: imageUrl };
        }
        else {
            return { ...f, uri: animationUrl };
        }
    });
    loglevel_1.default.info('Upload metadata');
    const metaData = Buffer.from(JSON.stringify(manifestJson));
    return (0, node_fetch_1.default)('https://api.nft.storage/upload', {
        method: 'POST',
        headers: {
            'Content-length': metaData.byteLength,
            Authorization: `Bearer ${nftStorageKey}`,
        },
        body: metaData, // Here, stringContent or bufferContent would also work
    })
        .then(response => response.json())
        .then(metaUploadResponse => {
        const link = `https://${metaUploadResponse.value.cid}.ipfs.dweb.link`;
        loglevel_1.default.info('Upload End');
        if (animation) {
            loglevel_1.default.debug([link, imageUrl, animationUrl]);
        }
        else {
            loglevel_1.default.debug([link, imageUrl]);
        }
        return [link, imageUrl, animationUrl];
    })
        .catch(error => {
        loglevel_1.default.debug(error);
        throw new Error(`Metadata Upload Error: ${error}`);
    });
}
exports.nftStorageUpload = nftStorageUpload;
