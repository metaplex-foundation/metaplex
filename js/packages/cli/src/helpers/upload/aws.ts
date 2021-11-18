import log from 'loglevel';
import { basename } from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'form-data';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  file: string,
  manifestBuffer: Buffer,
) {
  const REGION = 'us-east-1'; // TODO: Parameterize this.
  const s3Client = new S3Client({ region: REGION });
  const filename = `assets/${basename(file)}`;
  log.debug('file:', file);
  log.debug('filename:', filename);

  const fileStream = createReadStream(file);
  const mediaUrl = await uploadFile(
    s3Client,
    awsS3Bucket,
    filename,
    'image/png',
    fileStream,
  );

  // Copied from ipfsUpload
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = mediaUrl;
  manifestJson.properties.files = manifestJson.properties.files.map(f => {
    return { ...f, uri: mediaUrl };
  });
  const updatedManifestBuffer = Buffer.from(JSON.stringify(manifestJson));

  const metadataFilename = filename.replace(/.png$/, '.json');
  const metadataUrl = await uploadFile(
    s3Client,
    awsS3Bucket,
    metadataFilename,
    'application/json',
    updatedManifestBuffer,
  );

  return [metadataUrl, mediaUrl];
}
