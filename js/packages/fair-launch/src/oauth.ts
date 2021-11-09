import axios from "axios";

export async function getOAuthToken(
    client_id: string,
    redirect_url: string,
    auth_url: string,
    token_url: string,
) {
    console.log("Getting OAuth Token");
    const urlParams = new URLSearchParams(window.location.search);
    const code: string | null = urlParams.get('code');

    if (!!code) {
        console.log("Handling Redirect");
        await handleRedirect(client_id, redirect_url, token_url);
        
        window.location.search = "";
    }

    const tokenObjectRaw = window.sessionStorage.getItem('rpc.oauth.token') as any;

    if (!tokenObjectRaw || JSON.parse(tokenObjectRaw).expires < Date.now()) {
        console.log("Getting new token");
        return loginWithRedirect(client_id, redirect_url, auth_url);
    }

    const tokenObject = JSON.parse(tokenObjectRaw);

    console.log("Token Found", tokenObject, tokenObject.accessToken);

    return tokenObject.accessToken;
}

async function loginWithRedirect(
    client_id: string,
    redirect_url: string,
    auth_url: string
) {
    const stateIn = encode(createRandomString());
    //const nonceIn = encode(createRandomString());
    const code_verifier = createRandomString();
    const code_challengeBuffer = await sha256(code_verifier);
    const code_challenge = bufferToBase64UrlEncoded(code_challengeBuffer);

    window.sessionStorage.setItem('rpc.oauth',JSON.stringify({ code_verifier, state: stateIn }))

    const params = new URLSearchParams();
    params.append('client_id', client_id);
    params.append('code_challenge', code_challenge);
    params.append('code_challenge_method', 'S256');
    params.append('redirect_uri', redirect_url);
    params.append('response_type', 'code');
    params.append('state', stateIn);

    window.location.href = `${auth_url}?${params.toString()}`;
}

async function handleRedirect(
    client_id: string,
    redirect_url: string,
    token_url: string
) {

    const storage = JSON.parse(window.sessionStorage.getItem('rpc.oauth')!);
    const state = storage.state;
    const code_verifier = storage.code_verifier;

    const urlParams = new URLSearchParams(window.location.search);
    const code: string | null = urlParams.get('code');

    const params = new URLSearchParams();

    params.append('grant_type', 'authorization_code')
    params.append('client_id', client_id)
    params.append('code', code!)
    params.append('code_verifier', code_verifier)
    params.append('redirect_uri', redirect_url)


    const res = await axios.post(
        token_url,
        params,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
    )
    
    window.sessionStorage.setItem('rpc.oauth.token', JSON.stringify({
        accessToken: res.data.access_token,
        expires: Date.now() + res.data.expires_in * 1000,
    }))

    return res.data;
}

export const getCrypto = () => {
    //ie 11.x uses msCrypto
    return (window.crypto || (window as any).msCrypto) as Crypto;
  };
  
  export const getCryptoSubtle = () => {
    const crypto = getCrypto();
    //safari 10.x uses webkitSubtle
    return crypto.subtle || (crypto as any).webkitSubtle;
  };
  export const createRandomString = () => {
    const charset =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_~.';
    let random = '';
    const randomValues = Array.from(
      getCrypto().getRandomValues(new Uint8Array(43))
    );
    randomValues.forEach(v => (random += charset[v % charset.length]));
    return random;
  };
  
  export const encode = (value: string) => btoa(value);
  export const decode = (value: string) => atob(value);
  
  export const createQueryParams = (params: any) => {
    return Object.keys(params)
      .filter(k => typeof params[k] !== 'undefined')
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
  };
  
  export const sha256 = async (s: string) => {
    const digestOp: any = getCryptoSubtle().digest(
      { name: 'SHA-256' },
      new TextEncoder().encode(s)
    );
  
    // msCrypto (IE11) uses the old spec, which is not Promise based
    // https://msdn.microsoft.com/en-us/expression/dn904640(v=vs.71)
    // Instead of returning a promise, it returns a CryptoOperation
    // with a result property in it.
    // As a result, the various events need to be handled in the event that we're
    // working in IE11 (hence the msCrypto check). These events just call resolve
    // or reject depending on their intention.
    if ((window as any).msCrypto) {
      return new Promise((res, rej) => {
        digestOp.oncomplete = (e: any) => {
          res(e.target.result);
        };
  
        digestOp.onerror = (e: ErrorEvent) => {
          rej(e.error);
        };
  
        digestOp.onabort = () => {
          rej('The digest operation was aborted');
        };
      });
    }
  
    return await digestOp;
  };
  
  const urlEncodeB64 = (input: string) => {
    const b64Chars: { [index: string]: string } = { '+': '-', '/': '_', '=': '' };
    return input.replace(/[+/=]/g, (m: string) => b64Chars[m]);
  };
  
  const decodeB64 = (input: string) =>
    decodeURIComponent(
      atob(input)
        .split('')
        .map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  
  export const urlDecodeB64 = (input: string) =>
    decodeB64(input.replace(/_/g, '/').replace(/-/g, '+'));
  
  export const bufferToBase64UrlEncoded = (input: number[] | Uint8Array) => {
    const ie11SafeInput = new Uint8Array(input);
    return urlEncodeB64(
      window.btoa(String.fromCharCode(...Array.from(ie11SafeInput)))
    );
  };
  
  export const validateCrypto = () => {
    if (!getCrypto()) {
      throw new Error(
        'For security reasons, `window.crypto` is required to run `auth0-spa-js`.'
      );
    }
    if (typeof getCryptoSubtle() === 'undefined') {
      throw new Error(`
        auth0-spa-js must run on a secure origin. See https://github.com/auth0/auth0-spa-js/blob/master/FAQ.md#why-do-i-get-auth0-spa-js-must-run-on-a-secure-origin for more information.
      `);
    }
  };
  