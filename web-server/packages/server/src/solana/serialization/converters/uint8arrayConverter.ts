
export const uint8ArrayConverter = {
    from : (obj: any) =>
    {
        if(typeof obj === 'string' || obj instanceof String) {
            return Uint8Array.from(Buffer.from(obj, 'base64'))
        }
        return obj;
    },
    to : (obj : any) =>
    {
        if(obj instanceof Uint8Array) {
            return Buffer.from(obj).toString('base64');
        }

        return obj;
    }
}