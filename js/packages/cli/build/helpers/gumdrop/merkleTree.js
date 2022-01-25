"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleTree = void 0;
const js_sha3_1 = require("js-sha3");
class MerkleTree {
    constructor(leafs) {
        this.leafs = leafs.slice();
        this.layers = [];
        let hashes = this.leafs.map(MerkleTree.nodeHash);
        while (hashes.length > 0) {
            console.log('Hashes', this.layers.length, hashes);
            this.layers.push(hashes.slice());
            if (hashes.length === 1)
                break;
            hashes = hashes.reduce((acc, cur, idx, arr) => {
                if (idx % 2 === 0) {
                    const nxt = arr[idx + 1];
                    acc.push(MerkleTree.internalHash(cur, nxt));
                }
                return acc;
            }, Array());
        }
    }
    static nodeHash(data) {
        return Buffer.from(js_sha3_1.keccak_256.digest([0x00, ...data]));
    }
    static internalHash(first, second) {
        if (!second)
            return first;
        const [fst, snd] = [first, second].sort(Buffer.compare);
        return Buffer.from(js_sha3_1.keccak_256.digest([0x01, ...fst, ...snd]));
    }
    getRoot() {
        return this.layers[this.layers.length - 1][0];
    }
    getProof(idx) {
        return this.layers.reduce((proof, layer) => {
            const sibling = idx ^ 1;
            if (sibling < layer.length) {
                proof.push(layer[sibling]);
            }
            idx = Math.floor(idx / 2);
            return proof;
        }, []);
    }
    getHexRoot() {
        return this.getRoot().toString('hex');
    }
    getHexProof(idx) {
        return this.getProof(idx).map(el => el.toString('hex'));
    }
    verifyProof(idx, proof, root) {
        let pair = MerkleTree.nodeHash(this.leafs[idx]);
        for (const item of proof) {
            pair = MerkleTree.internalHash(pair, item);
        }
        return pair.equals(root);
    }
    static verifyClaim(leaf, proof, root) {
        let pair = MerkleTree.nodeHash(leaf);
        for (const item of proof) {
            pair = MerkleTree.internalHash(pair, item);
        }
        return pair.equals(root);
    }
}
exports.MerkleTree = MerkleTree;
