import { PublicKey } from '@solana/web3.js';

const SIGN_META_ENDPOINT = process.env
  .NEXT_PUBLIC_HOLAPLEX_SIGN_META_ENDPOINT as string;

export interface SignMetaParams {
  solanaEndpoint: string;
  metadata: string;
  metaProgramId: string;
}

export type SignMetaDataStatus = 'setup' | 'signing' | 'signed' | 'failed';
export const holaSignMetadata = async ({
  solanaEndpoint,
  metadata,
  metaProgramId,
  onProgress,
  onComplete,
  onError,
}: {
  solanaEndpoint: string;
  metadata: PublicKey;
  metaProgramId: PublicKey;
  onProgress?: (status: SignMetaDataStatus) => void;
  onComplete?: () => void;
  onError?: (msg: string) => void;
}) => {
  try {
    if (!onProgress) onProgress = () => {};

    onProgress('setup');

    const params: SignMetaParams = {
      solanaEndpoint,
      metadata: metadata.toBase58(),
      metaProgramId: metaProgramId.toBase58(),
    };

    onProgress('signing');

    const resp = await fetch(SIGN_META_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      let json;

      try {
        json = await resp.json();
      } catch {
        json = { message: 'An error occurred' };
      }

      throw new Error(
        `Store upload failed: ${json.message ?? JSON.stringify(json)}`,
      );
    }

    onProgress('signed');

    if (onComplete) onComplete();
  } catch (e) {
    if (onProgress) onProgress('failed');
    if (onError && e instanceof Error) onError(e.message);

    throw e;
  }
};
