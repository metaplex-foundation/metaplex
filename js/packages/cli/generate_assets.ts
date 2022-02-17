import * as fs from 'fs';

(async () => {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const readFiles: {
    index: number,
    json: Buffer,
    image: Buffer,
  }[] = await Promise.all(numbers
    .map(index => new Promise<{
      index: number,
      json: Buffer,
      image: Buffer,
    }>((resolve, reject) => {
      let temp: Buffer | null = null;
      fs.readFile(`example-assets/${index}.json`, (err, data) => {
        if (err){
          reject(err)
        } else {
          if (temp){
            resolve({
              index,
              json: data,
              image: temp
            })
          } else {
            temp = data;
          }
        }
      })
      fs.readFile(`example-assets/${index}.png`, (err, data) => {
        if (err){
          reject(err)
        } else {
          if (temp){
            resolve({
              index,
              json: temp,
              image: data
            })
          } else {
            temp = data;
          }
        }
      })
    }))
  );
  await Promise.all(readFiles.map(async file => Promise.all(numbers.map(num => {
    const value = num * 10 + file.index;
    const json = JSON.parse(file.json.toString());
    json.name = value.toString();
    Promise.all([
      new Promise<void>(resolve => fs.writeFile(`example-assets/${value}.json`, JSON.stringify(json, undefined, 2), () => resolve())),
      new Promise<void>(resolve => fs.writeFile(`example-assets/${value}.png`, file.image, () => resolve())),
    ])
  }))))
})().catch(e => {
  throw e;
})
