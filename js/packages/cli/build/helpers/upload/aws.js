"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsUpload = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const path_1 = require("path");
const fs_1 = require("fs");
const client_s3_1 = require("@aws-sdk/client-s3");
const path_2 = __importDefault(require("path"));
const mime_1 = require("mime");
async function uploadFile(s3Client, awsS3Bucket, filename, contentType, body) {
    const mediaUploadParams = {
        Bucket: awsS3Bucket,
        Key: filename,
        Body: body,
        ACL: 'public-read',
        ContentType: contentType,
    };
    try {
        await s3Client.send(new client_s3_1.PutObjectCommand(mediaUploadParams));
        loglevel_1.default.info('uploaded filename:', filename);
    }
    catch (err) {
        loglevel_1.default.debug('Error', err);
    }
    const url = `https://${awsS3Bucket}.s3.amazonaws.com/${filename}`;
    loglevel_1.default.debug('Location:', url);
    return url;
}
async function awsUpload(awsS3Bucket, file, manifestBuffer) {
    const REGION = 'us-east-1'; // TODO: Parameterize this.
    const s3Client = new client_s3_1.S3Client({ region: REGION });
    const filename = `assets/${(0, path_1.basename)(file)}`;
    loglevel_1.default.debug('file:', file);
    loglevel_1.default.debug('filename:', filename);
    const imageExt = path_2.default.extname(file);
    const fileStream = (0, fs_1.createReadStream)(file);
    const mediaUrl = await uploadFile(s3Client, awsS3Bucket, filename, (0, mime_1.getType)(file), fileStream);
    // Copied from ipfsUpload
    const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
    manifestJson.image = mediaUrl;
    manifestJson.properties.files = manifestJson.properties.files.map(f => {
        return { ...f, uri: mediaUrl };
    });
    const updatedManifestBuffer = Buffer.from(JSON.stringify(manifestJson));
    const extensionRegex = new RegExp(`${imageExt}$`);
    const metadataFilename = filename.replace(extensionRegex, '.json');
    const metadataUrl = await uploadFile(s3Client, awsS3Bucket, metadataFilename, 'application/json', updatedManifestBuffer);
    return [metadataUrl, mediaUrl];
}
exports.awsUpload = awsUpload;
