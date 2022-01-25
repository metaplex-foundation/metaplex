"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGenerativeArt = void 0;
const os_1 = __importDefault(require("os"));
const promises_1 = require("fs/promises");
const canvas_1 = require("canvas");
const imagemin_1 = __importDefault(require("imagemin"));
const imagemin_pngquant_1 = __importDefault(require("imagemin-pngquant"));
const loglevel_1 = __importDefault(require("loglevel"));
const various_1 = require("../helpers/various");
const metadata_1 = require("../helpers/metadata");
function makeCreateImageWithCanvas(order, width, height) {
    return function makeCreateImage(canvas, context) {
        return async function createImage(image) {
            const start = Date.now();
            const ID = parseInt(image.id, 10) - 1;
            for (const cur of order) {
                const imageLocation = `${metadata_1.TRAITS_DIRECTORY}/${cur}/${image[cur]}`;
                const loadedImage = await (0, canvas_1.loadImage)(imageLocation);
                context.patternQuality = 'best';
                context.quality = 'best';
                context.drawImage(loadedImage, 0, 0, width, height);
            }
            const buffer = canvas.toBuffer('image/png');
            context.clearRect(0, 0, width, height);
            const optimizedImage = await imagemin_1.default.buffer(buffer, {
                plugins: [
                    (0, imagemin_pngquant_1.default)({
                        quality: [0.6, 0.95],
                    }),
                ],
            });
            await (0, promises_1.writeFile)(`${metadata_1.ASSETS_DIRECTORY}/${ID}.png`, optimizedImage);
            const end = Date.now();
            loglevel_1.default.info(`Placed ${ID}.png into ${metadata_1.ASSETS_DIRECTORY}.`);
            const duration = end - start;
            loglevel_1.default.info('Image generated in:', `${duration}ms.`);
        };
    };
}
const CONCURRENT_WORKERS = os_1.default.cpus().length;
const worker = (work, next_) => async () => {
    let next;
    while ((next = next_())) {
        await work(next);
    }
};
async function createGenerativeArt(configLocation, randomizedSets) {
    const start = Date.now();
    const { order, width, height } = await (0, various_1.readJsonFile)(configLocation);
    const makeCreateImage = makeCreateImageWithCanvas(order, width, height);
    const imagesNb = randomizedSets.length;
    const workers = [];
    const workerNb = Math.min(CONCURRENT_WORKERS, imagesNb);
    loglevel_1.default.info(`Instanciating ${workerNb} workers to generate ${imagesNb} images.`);
    for (let i = 0; i < workerNb; i++) {
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const context = canvas.getContext('2d');
        const work = makeCreateImage(canvas, context);
        const w = worker(work, randomizedSets.pop.bind(randomizedSets));
        workers.push(w());
    }
    await Promise.all(workers);
    const end = Date.now();
    const duration = end - start;
    loglevel_1.default.info(`Generated ${imagesNb} images in`, `${duration / 1000}s.`);
}
exports.createGenerativeArt = createGenerativeArt;
