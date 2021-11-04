import fs from 'fs';

export function loadMaxSupply(maxSupplyPath: string) {
  return fs.existsSync(maxSupplyPath)
    ? JSON.parse(fs.readFileSync(maxSupplyPath).toString())
    : undefined;
}
