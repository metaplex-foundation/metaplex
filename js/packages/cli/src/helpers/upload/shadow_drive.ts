import fs from 'fs';
import {Connection, PublicKey} from '@solana/web3.js';
import {ShadowFile, ShdwDrive} from "@shadow-drive/sdk";
import {AssetKey} from "../../types";
import * as cliProgress from 'cli-progress';
import log from "loglevel";
import {Wallet} from "@project-serum/anchor"
import path from "path";
import {setImageUrlManifest} from "./file-uri";
import {getAssetManifest} from "../../commands/upload";
import {isNull} from "lodash";

type Manifest = {
  name: string;
  image: string;
  animation_url: string;
  properties: {
    files: Array<{ type: string; uri: string }>;
  };
};

export type ShadowDriveBundleUploadAsset = {
  cacheKey: string;
  ext: string;
  imagePath: string;
  animationPath: string | null;
  manifestPath: string;
  manifestUrl: string;
  updatedManifest: Manifest;
}

export type ShadowDriveBundleUploadResult = {
  assets: ShadowDriveBundleUploadAsset[];
};

class MetaplexShadowDrive {
  dirname: string
  walletKeyPair: string
  shadowDriveAddress: string
  assets: AssetKey[]

  maxFilesPerTxn: number = 5  //Can be increased once QUIC is here

  shadowDrivePk: PublicKey

  connection: Connection
  shadowDrive: ShdwDrive

  program = new PublicKey("SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y");

  constructor(dirname: string, env: string, rpcUrl: string, walletKeyPair, assets: AssetKey[]) {
    this.dirname = dirname
    this.walletKeyPair = walletKeyPair
    this.assets = assets
  }

  setDriveAddress(driveAddress: string) {
    this.shadowDriveAddress = driveAddress
    this.shadowDrivePk = new PublicKey(driveAddress)
  }

  async init(env, rpcUrl, keyPair): Promise<ShdwDrive> {
    const conn = this._startConnection(env, rpcUrl)
    return new ShdwDrive(conn, new Wallet(keyPair)).init()
  }

  /**
   * Start our connection to sol endpoint
   */
  _startConnection(env, rpcUrl): Connection {
    this.connection = new Connection(
      rpcUrl || "https://ssc-dao.genesysgo.net/",
      'finalized',
    );
    return this.connection;
  }

  /**
   * Sample n amount of files to establish a total cost for the files to be uploaded in bytes
   * @param dirname
   * @param files
   */
  getRequiredSize(dirname: string, files: AssetKey[]): number {
    const fileCount = files.length
    const fileSizes = [];
    const sampleCount = 10; //How many files to sample in collection
    let totalSampleBytes = 0;

    for (let i = 0; i < sampleCount; i++) {
      const name = `${files[i].index}${files[i].mediaExt}`
      const manifestName = `${files[i].index}.json`
      totalSampleBytes += this.getFilesizeInBytes(path.join(dirname, name)) //Image
      totalSampleBytes += this.getFilesizeInBytes(path.join(dirname, manifestName)) //Manifest
    }

    const avgSize = Math.round(totalSampleBytes / sampleCount)
    const totalSize = (fileCount * avgSize) //Convert to MB

    log.debug(`Required size for ${fileCount} files = ${totalSize} Bytes`, {
      fileSizes: fileSizes,
      totalSampleBytes: totalSampleBytes,
      avgSize: avgSize
    })
    return totalSize;
  }

  /**
   * Returns if the keyPair has enough SHDW to complete the TXN
   * @param keyPair
   * @param amountRequired
   */
  async hasSufficientBalance(keyPair, amountRequired): Promise<boolean> {
    const shdwBalance = await this.getSHDWBalances(keyPair);

    const token = shdwBalance.value[0];
    let amount
    if (!token) {
      amount = 0;
    } else {
      amount = parseInt(token.account.data.parsed.info.tokenAmount.amount)
    }

    log.info("SHDW Balance: ", amount)
    return amount > amountRequired
  }

  /**
   * Returns the keyPair SHDW balance
   * @param keyPair
   */
  async getSHDWBalances(keyPair) {
    return this.connection.getParsedTokenAccountsByOwner(keyPair.publicKey, {mint: this.program})
  }

  /**
   * Returns the file size of given filename in bytes
   * @param filename
   */
  getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    return stats.size;
  }

  /**
   * Converts size & denominator to correct string format for drive allocation
   * @param size
   * @param denom
   */
  toSizeDenom(size, denom): string {
    const validDenoms = ["KB", "MB", "GB"]
    if (!validDenoms.includes(denom)) {
      return `${size}KB`;
    }

    return `${size}${denom}`;
  }

  /**
   * Returns the url endpoint for a given drive & file
   * @param drive
   * @param fileName
   */
  toUrl(drive: string, fileName: string): string {
    return `https://shadow-storage.genesysgo.net/${drive}/${fileName}`
  }

  randomDriveName(prefix: string = 'shdw'): string {
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`
  }

  //Upload batch of files to shadow drive
  async uploadBatch(batch: ShadowDriveBundleUploadAsset[], onProgress) {
    let files: ShadowFile[] = [];

    for (let i = 0; i < batch.length; i++) {

      const manifest = {
        name: `${batch[i].cacheKey}.json`,
        file: Buffer.from(JSON.stringify(batch[i].updatedManifest), "utf-8"),
      } as ShadowFile

      files.push(manifest)


      files.push({
        name: `${batch[i].cacheKey}${batch[i].ext}`,
        file: fs.readFileSync(batch[i].imagePath)
      })

      if (batch[i].animationPath)
        files.push({
          file: fs.readFileSync(batch[i].animationPath)
        } as ShadowFile)

      if (files.length >= this.maxFilesPerTxn) {
        log.info("Uploading files: ", files.length)
        await this.shadowDrive.uploadMultipleFiles(this.shadowDrivePk, files)
        onProgress(files.length)
        files = [];
        log.info("Files uploaded")
      }
    }
  }

  /**
   * Prepare the asset by inferring paths & adding to manifest
   * @param bundle
   * @param asset
   */
  async prepareAsset(asset): Promise<ShadowDriveBundleUploadAsset> {
    const manifestPath = path.join(this.dirname, `${asset.index}.json`);
    const imagePath = path.join(this.dirname, asset.index + asset.mediaExt);

    const manifestUrl = this.toUrl(this.shadowDriveAddress, `${asset.index}.json`)
    const imageUrl = this.toUrl(this.shadowDriveAddress, asset.index + asset.mediaExt)
    let animationUrl = ""

    const bundle = {
      cacheKey: asset.index,
      ext: asset.mediaExt,
      imagePath: imagePath,
      manifestPath: manifestPath,
      manifestUrl: manifestUrl,
    } as ShadowDriveBundleUploadAsset

    const manifest = getAssetManifest(this.dirname, asset.index);
    let animation = undefined;
    if ('animation_url' in manifest) {
      animation = path.join(this.dirname, `${manifest.animation_url}`);
      animationUrl = this.toUrl(this.shadowDriveAddress, `${manifest.animation_url}`)
      bundle.animationPath = animation
    }
    const manifestBuffer = Buffer.from(JSON.stringify(manifest));

    const manifestJson = await setImageUrlManifest(
      manifestBuffer.toString('utf8'),
      imageUrl,
      animationUrl,
    );

    bundle.updatedManifest = manifestJson as Manifest

    return bundle
  }
}

export async function* shadowDriveUploadGenerator({
                                                    dirname,
                                                    env,
                                                    walletKeyPair,
                                                    shadowDriveAddress,
                                                    assets,
                                                    batchSize,
                                                    rpcUrl,
                                                    onDriveCreate,
                                                  }
                                                    : {
                                                    dirname: string,
                                                    env,
                                                    walletKeyPair,
                                                    shadowDriveAddress: string | null,
                                                    assets: AssetKey[],
                                                    batchSize: number | null,
                                                    rpcUrl: string,
                                                    onDriveCreate: (driveID) => void,
                                                  }
) {

  //Currently its 5 items per txn with Shadow Drive,

  const BATCH_SIZE = batchSize || 50; //Can be increased once QUIC Completed

  const numBatches = Math.ceil(assets.length / BATCH_SIZE);
  const batches: AssetKey[][] = new Array(numBatches)
    .fill([])
    .map((_, i) => assets.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));

  log.info(`Uploading to shadow drive in ${batches.length} batches`);

  //Create our shadow instance
  const shdw = new MetaplexShadowDrive(dirname, env, rpcUrl, walletKeyPair, assets)
  shdw.shadowDrive = await shdw.init(env, rpcUrl, walletKeyPair)
  log.info("Connected to shadow drive")

  const MB = 1048576; //Size of MB in bytes
  const estimatedSizeInBytes = shdw.getRequiredSize(dirname, assets)
  const estimatedSizeInMB = estimatedSizeInBytes / MB

  //If we dont have a shadow drive assigned, created it
  if (shadowDriveAddress === "" || isNull(shadowDriveAddress)) {
    //Check the user has enough to create the shadow drive
    if (!await shdw.hasSufficientBalance(walletKeyPair, estimatedSizeInBytes + MB)) {
      // console.error(`Not enough SHDW to create drive, need: ${estimatedSizeInBytes / 1000000000} SHDW`,) //1 SHADE == 1 BYTE
      throw `Not enough SHDW to create drive, need: ${estimatedSizeInBytes / 1000000000} SHDW`
    }

    //Create the drive
    const driveName = shdw.randomDriveName("candy-machine") //Randomized candy machine name to reduce collision chance
    const driveSize = shdw.toSizeDenom(estimatedSizeInMB + MB, "MB");
    log.info("Creating new shadow drive: ", driveName, driveSize)
    const r = await shdw.shadowDrive.createStorageAccount(driveName, driveSize);

    log.info("Shadow drive created: ", r.shdw_bucket)
    shadowDriveAddress = r.shdw_bucket
    onDriveCreate(shadowDriveAddress) //Call to update cache
  } else {
    log.info("Using existing shadow drive", shadowDriveAddress)

    shdw.setDriveAddress(shadowDriveAddress)
    const shadowDrivePk = new PublicKey(shadowDriveAddress)
    const existingDrive = await shdw.shadowDrive.getStorageAccount(shadowDrivePk)

    //Check we have enough storage allocation
    const hasEnoughSpace = existingDrive.storageAvailable > estimatedSizeInBytes
    if (!hasEnoughSpace) {
      //Increase by allocation + 1MB to allow for some wiggle room
      const amountToIncreaseBytes = estimatedSizeInBytes - existingDrive.storageAvailable + (1 + MB);
      const amountToIncrease = amountToIncreaseBytes / 1024; //KB
      log.info(`Increasing drive capacity by: ${amountToIncrease} KB`)
      await shdw.shadowDrive.addStorage(shadowDrivePk, shdw.toSizeDenom(amountToIncrease, "KB"))
    }
  }

  //Set our drive address
  shdw.setDriveAddress(shadowDriveAddress)

  //Loop through batches and upload
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    const bundled: ShadowDriveBundleUploadAsset[] = [];

    log.debug(`Generating: bundle #${i + 1} of ${batches.length}`);
    const packProgressBar = new cliProgress.SingleBar({format: `Uploading bundle #${batchNum}: [{bar}] {percentage}% | {value}/{total}`,}, cliProgress.Presets.shades_classic,);
    packProgressBar.start(batch.length, 0);


    //Pack assets
    for (const asset of batch) {
      bundled.push(await shdw.prepareAsset(asset))
      packProgressBar.update(bundled.length);
    }
    packProgressBar.stop();

    log.debug(`Uploading: bundle #${i + 1} of ${bundled.length}`);
    const uploadProgressBar = new cliProgress.SingleBar({format: `Uploading bundle #${batchNum}: [{bar}] {percentage}% | {value}/{total}`,}, cliProgress.Presets.shades_classic,);
    uploadProgressBar.start(bundled.length, 0);

    let progress = 0;
    await shdw.uploadBatch(bundled, (amountUploaded: number) => {
      progress += amountUploaded
      uploadProgressBar.update(progress)
    });
    log.debug(`Complete: bundle #${i + 1} of ${batches.length}`)
    uploadProgressBar.stop();

    yield {
      assets: bundled,
    };
  }
}
