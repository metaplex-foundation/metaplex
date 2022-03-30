import log from 'loglevel';
import { basename } from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'form-data';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { getType } from 'mime';

async function uploadFile(
  s3Client: S3Client,
  awsS3Bucket: string,
  filename: string,
  contentType: string,
  body: string | Readable | ReadableStream<any> | Blob | Uint8Array | Buffer,
): Promise<string> {
  const mediaUploadParams = {
    Bucket: awsS3Bucket,
    Key: filename,
    Body: body,
    ACL: 'public-read',
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(mediaUploadParams));
    log.info('uploaded filename:', filename);
  } catch (err) {
    log.info('Error', err);
  }

  const url = `https://${awsS3Bucket}.s3.amazonaws.com/${filename}`;
  log.debug('Location:', url);
  return url;
}

export async function awsUpload(
  awsS3Bucket: string,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
) {
  const REGION = 'us-east-1'; // TODO: Parameterize this.
  const s3Client = new S3Client({ region: REGION });

  async function uploadMedia(media) {
    const mediaPath = `assets/${basename(media)}`;
    log.debug('media:', media);
    log.debug('mediaPath:', mediaPath);
    const mediaFileStream = createReadStream(media);
    const mediaUrl = await uploadFile(
      s3Client,
      awsS3Bucket,
      mediaPath,
      getType(media),
      mediaFileStream,
    );
    return mediaUrl;
  }

  // Copied from ipfsUpload
  const imageUrl = `${await uploadMedia(image)}?ext=${path
    .extname(image)
    .replace('.', '')}`;
  const animationUrl = animation
    ? `${await uploadMedia(animation)}?ext=${path
        .extname(animation)
        .replace('.', '')}`
    : undefined;
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageUrl;
  if (animation) {
    manifestJson.animation_url = animationUrl;
  }

  const updatedManifestBuffer = Buffer.from(JSON.stringify(manifestJson));

  const extensionRegex = new RegExp(`${path.extname(image)}$`);
  const metadataFilename = image.replace(extensionRegex, '.json');
  const metadataUrl = await uploadFile(
    s3Client,
    awsS3Bucket,
    metadataFilename,
    'application/json',
    updatedManifestBuffer,
  );

  return [metadataUrl, imageUrl, animationUrl];
}
