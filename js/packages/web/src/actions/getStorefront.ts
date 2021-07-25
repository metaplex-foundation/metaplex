import { ArweaveTransaction, Storefront } from './../models/storefront'

const ARWEAVE_URL = process.env.NEXT_PUBLIC_ARWEAVE_URL;

export const getStorefront = async (subdomain: string): Promise<Storefront | null> => {
  try {
    const response = await fetch(`${ARWEAVE_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query GetStorefrontTheme($subdomain: String!) {
              transactions(tags:[{ name: "holaplex:metadata:subdomain", values: [$subdomain]}], first: 1) {
                edges {
                  node {
                    id
                    tags {
                      name
                      value
                    }
                  }
                }
              }
            }
          `,
        variables: {
          subdomain,
        },
      })
    })

    const { data: { transactions: { edges: [{ node }] } } } = await response.json() as ArweaveQueryResponse
    const transaction = node as ArweaveTransaction

    const values = transaction.tags.reduce((acc: any, tag) => {
      acc[tag.name] = tag.value || null

      return acc
    }, {})

    return {
      pubkey: values["solana:pubkey"],
      favicon: values["holaplex:metadata:favicon:url"],
      logo: values["holaplex:theme:logo:url"],
      stylesheet: `${ARWEAVE_URL}/${transaction.id}`,
      meta: {
        title: values["holaplex:metadata:page:title"],
        description: values["holaplex:metadata:page:description"]
      }
    }
  } catch(e) {
    return null
  }
}
