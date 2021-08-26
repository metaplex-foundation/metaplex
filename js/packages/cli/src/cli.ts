#!/usr/bin/env node

const Arweave = require('arweave');
import * as fs from 'fs';
import * as path from 'path';
const { program } = require('commander');

const CACHE_PATH = './.cache';

program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

program
  .command('upload-images')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      return fs.readdirSync(`${val}`);
    },
  )
  // .argument('[second]', 'integer argument', (val) => parseInt(val), 1000)
  .option('-s, --start-with', 'Image index to start with', '0')
  .option('-n, --number', 'Number of images to upload', '10000')
  .action((files: string[], second, options) => {
    const extension = '.png';
    const { startWith } = options;
    console.log(options);
    const images = files.filter(val => path.extname(val) === extension);

    // console.log(`${images} + ${second} = ${1 + 2}`);
  });

program.command('upload-manifest').action(() => {});

program
  .command('verify-upload')
  .argument(
    '<directory>',
    'Directory containing images named from 0-n',
    val => {
      // return list of paths to each image
      return ['x', 'y'];
    },
  )
  .argument('[second]', 'integer argument', val => parseInt(val), 1000)
  .option('-n, --number', 'Number of images to upload', '10000')
  .action((directory, second, options) => {
    console.log(`${directory} + ${second} = ${1 + 2}`);
  });

program.command('find-wallets').action(() => {});

program.parse(process.argv);
