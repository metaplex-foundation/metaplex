import { keccak_256 } from "js-sha3";

export class MerkleTree {
  leafs: Array<Buffer>;
  layers: Array<Array<Buffer>>;

  constructor(leafs : Array<Buffer>) {
    this.leafs = leafs.slice();
    this.layers = [];

    let hashes = this.leafs.map(l => Buffer.from(keccak_256.digest([0x00, ...l])));
    while (hashes.length > 0) {
      this.layers.push(hashes.slice());
      if (hashes.length === 1) break;
      hashes = hashes.reduce((acc, cur, idx, arr) => {
        if (idx % 2 === 0) {
          const nxt = arr[idx + 1];
          acc.push(MerkleTree.internalHash(cur, nxt));
        }
        return acc;
      }, Array<Buffer>());
    }
  }

  static internalHash(
    first : Buffer,
    second: Buffer | undefined,
  ) : Buffer {
    return Buffer.from(
      keccak_256.digest([0x01, ...first, ...(second || [])])
    );
  }

  getRoot() : Buffer {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(idx : number) : Buffer[] {
    return this.layers.reduce((proof, layer) => {
      const sibling = idx ^ 1;
      if (sibling < layer.length) {
        proof.push(layer[sibling]);
      }

      idx = Math.floor(idx / 2);

      return proof;
    }, []);
  }

  getHexRoot(): string {
    return this.getRoot().toString("hex");
  }

  getHexProof(idx : number) : string[] {
    return this.getProof(idx).map((el) => el.toString("hex"));
  }
}
