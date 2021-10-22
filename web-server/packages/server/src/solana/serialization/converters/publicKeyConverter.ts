import { PublicKey } from "@solana/web3.js";

export const publicKeyConverter = {
    from : (obj: any) =>
    {
        if(typeof obj === 'string' || obj instanceof String) {
            return new PublicKey(obj as string);
        }
        return obj;
    },
    to : (obj : any) =>
    {
        if(obj instanceof PublicKey) {
            return obj.toString();
        }

        return obj;
    }
}