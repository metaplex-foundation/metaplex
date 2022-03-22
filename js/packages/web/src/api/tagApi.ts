import axios from 'axios'

const HEADER_TOKEN = '4Kk`c,+p?;7<Na<vTKt{d;Pg.K#=FzsuM+c}c-FKn#AhQA$>cdAcwHX:wc]>=3Gq'

export async function createTokenForNft(publicKey: string, tagName: string, metadata: any) {
  try {
    const tokenApiBaseEndPoint = process.env.REACT_APP_TOKEN_API
    const bodyData = {
      nft_pub_key: publicKey,
      tag_name: tagName,
      metadata: metadata,
    }

    return await axios.post(`${tokenApiBaseEndPoint}/dev/nft/tags/create`, bodyData, {
      headers: {
        'x-kmplx-token': HEADER_TOKEN,
      },
    })
  } catch (error: any) {
    throw new Error(error)
  }
}
