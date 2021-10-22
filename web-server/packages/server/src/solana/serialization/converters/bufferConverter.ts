export const bufferConverter = {
    from : (obj: any) =>
    {
        console.log('hee', obj);
        if(typeof obj === 'string' || obj instanceof String) {
            return Buffer.from(obj, 'base64')
        }
        return obj;
    },
    to : (obj : any) =>
    {
        if(obj instanceof Buffer) {
            return obj.toString('base64');
        }

        return obj;
    }
}