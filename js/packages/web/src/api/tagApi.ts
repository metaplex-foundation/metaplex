import axios from 'axios'

const HEADER_TOKEN = '4Kk`c,+p?;7<Na<vTKt{d;Pg.K#=FzsuM+c}c-FKn#AhQA$>cdAcwHX:wc]>=3Gq'

const api = `${process.env.NEXT_API_URL}`


export async function createTokenForNft(publicKey: string, tagName: string, metadata: any) {
  try {
    const bodyData = {
      nft_pub_key: publicKey,
      tag_name: tagName,
      metadata: metadata,
    }

    const response = await axios.post(
      `https://xs9wjo3jfl.execute-api.us-east-1.amazonaws.com/dev/nft/tags/create`,
      bodyData,
      {
        headers: {
          'x-kmplx-token': HEADER_TOKEN,
          'origin': 'http://localhos:3000',
          'Accept': 'application/json, text/plain, */*',
          'Host': 'xs9wjo3jfl.execute-api.us-east-1.amazonaws.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,*',
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.log('ERROR TAG: ', error)
    throw new Error(error)
  }
}

export async function getNftForTag() {
  try {
    const response = await axios.get(
      'https://xs9wjo3jfl.execute-api.us-east-1.amazonaws.com/dev/nft/tags?tag_name=Gaming&show_meta=true',
      {
        headers: {
          'x-kmplx-token': HEADER_TOKEN,
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.log(error)
    return error.message
  }
}

export async function getCollectionTags() {
  try {
    const response = await axios.get(
      `${api}/tags/get`,
      {
        headers: {
          'x-kmplx-token': HEADER_TOKEN,
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.log(error)
    return error.message
  }
}
