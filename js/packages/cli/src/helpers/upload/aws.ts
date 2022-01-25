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
    log.debug('Error', err);
  }

  const url = `https://${awsS3Bucket}.s3.amazonaws.com/${filename}`;
  log.debug('Location:', url);
  return url;
}

export async function awsUpload(
  awsS3Bucket: string,
  imageFile: string,
  animationFile: string,
  manifestBuffer: Buffer,
) {
  const REGION = 'us-east-1'; // TODO: Parameterize this.
  const s3Client = new S3Client({ region: REGION });
  const imageFilename = `assets/${basename(imageFile)}`;
  log.debug('imageFile:', imageFile);
  log.debug('imageFilename:', imageFilename);

  const imageExt = path.extname(imageFile);
  const imageFileStream = createReadStream(imageFile);
  const imageUrl = await uploadFile(
    s3Client,
    awsS3Bucket,
    imageFilename,
    getType(imageFile),
    imageFileStream,
  );

  let animationUrl = undefined
  if (animationFile) {
    const animationFilename = `assets/${basename(animationFile)}`;
    log.debug('animationFile:', animationFile);
    log.debug('animationFilename:', animationFilename);

    const animationExt = path.extname(animationFile);
    const animationFileStream = createReadStream(animationFile);
    const animationUrl = await uploadFile(
      s3Client,
      awsS3Bucket,
      animationFilename,
      getType(animationFile),
      animationFileStream,
    );
  }

  // Copied from ipfsUpload
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageUrl;
  if (animationFile) {
    manifestJson.animation_url = animationUrl;
  }

  manifestJson.properties.files = manifestJson.properties.files.map(f => {
    if (f.type.startsWith('image/')) {
      return { ...f, uri: imageUrl };
    } else {
      return { ...f, uri: animationUrl };
    }
  });

  const updatedManifestBuffer = Buffer.from(JSON.stringify(manifestJson));

  const extensionRegex = new RegExp(`${imageExt}$`);
  const metadataFilename = imageFilename.replace(extensionRegex, '.json');
  const metadataUrl = await uploadFile(
    s3Client,
    awsS3Bucket,
    metadataFilename,
    'application/json',
    updatedManifestBuffer,
  );

  return [metadataUrl, imageUrl, animationUrl];
}
