import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { useParams } from 'react-router-dom'
import { Chip } from '../../atoms/Chip'
import { TextField } from '../../atoms/TextField'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'
import { ArtCard } from '../../molecules/ArtCard'
import { Modal } from '../../molecules/Modal'
import { ArtDetails } from '../../molecules/ArtDetails'
import { QuickBuy } from '../../sections/QuickBuy'

import { arts } from '../../../../dummy-data/arts'
<<<<<<< Updated upstream
import { PublicKey } from '@solana/web3.js'

import {
  MetadataKey,
  pubkeyToString,
  StringPublicKey,
  useConnection,
  useStore,
  Spinner,
  useViewport,
  Button,
} from '@oyster/common'
import bs58 from 'bs58'
import { actions, programs } from '@metaplex/js'
import { getPhantomWallet } from '@solana/wallet-adapter-wallets'

const {
  metaplex: { Store, AuctionManager },
  auction: { Auction, AuctionExtended, AuctionData },
  vault: { Vault },
} = programs

import { Metadata, MetadataData } from '@metaplex-foundation/mpl-token-metadata'
import { useExtendedArt, useStoreAuctionsList } from '../../../hooks'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { useLocation } from 'react-router-dom'
=======
import { actions, NodeWallet, Wallet } from '@metaplex/js'
import { Crypto } from '@metaplex/js/lib/utils/'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection, sendTransactions, sendTransactionWithRetry } from '@oyster/common'
import { WalletContextState } from '@solana/wallet-adapter-react'
import {
  AccountInfo,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  Commitment,
  TransactionInstruction,
} from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token'
//import CreateAssociatedTokenAccount from '@metaplex/js/lib/CreateAssociatedTokenAccount'
>>>>>>> Stashed changes

import { createAssociatedTokenAccountInstruction, toPublicKey } from '@oyster/common'
import { Account } from '@metaplex-foundation/mpl-core'
export interface CollectionItemsProps {
  [x: string]: any
}

// interface IToken {
//   mint: PublicKey
//   address: PublicKey
//   metadataPDA?: PublicKey
//   metadataOnchain?: MetadataData
// }

export const CollectionItems: FC<CollectionItemsProps> = ({
  className,
  dataItems,
  ...restProps
}: CollectionItemsProps) => {
  const CollectionItemsClasses = CN(`collection-items w-full`, className)
  const [showQuickBuyModal, setShowQuickBuyModal] = useState<boolean>(false)
  const [showArtModalModal, setShowArtModalModal] = useState<boolean>(false)
  const [selectedArt, setSelectedArt] = useState<any>(null)

<<<<<<< Updated upstream
  ///////
  const { storeAddress } = useStore()

  let [collection, setCollection] = useState<string | null>()

  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)
  const { isDesktop, isMobile } = useViewport()

  // ///////////////
  // const connection = useConnection()
  // const search = useLocation().search
  // const name = new URLSearchParams(search).get('collection')

  // const initialValue: any[] = []
  // const [dataItems, setDataItems] = useState(initialValue)

  // useEffect(() => {
  //   const getUserItems = async () => {
  //     let collectionName = name
  //     setCollection(collectionName)
  //     const baseFilters = [
  //       // Filter for MetadataV1 by key
  //       {
  //         memcmp: {
  //           offset: 0,
  //           bytes: bs58.encode(Buffer.from([MetadataKey.MetadataV1])),
  //         },
  //       },
  //     ].filter(Boolean)

  //     async function getHolderByMint(mint: PublicKey): Promise<PublicKey> {
  //       const tokens = await connection.getTokenLargestAccounts(mint)
  //       return tokens.value[0].address // since it's an NFT, we just grab the 1st account
  //     }

  //     async function deserializeMetadata(rawMetadata: any) {
  //       return await Metadata.load(connection, rawMetadata.pubkey)
  //     }

  //     async function metadatasToTokens(rawMetadatas: any[]): Promise<IToken[]> {
  //       const promises = await Promise.all(
  //         rawMetadatas.map(async m => {
  //           debugger
  //           try {
  //             const metadata = await deserializeMetadata(m)
  //             const mint = new PublicKey(metadata.data.mint)
  //             const address = await getHolderByMint(mint)
  //             return {
  //               mint,
  //               address,
  //               metadataPDA: metadata.pubkey,
  //               metadataOnchain: metadata.data,
  //             } as IToken
  //           } catch (e) {
  //             console.log('failed to deserialize one of the fetched metadatas')
  //           }
  //         })
  //       )
  //       return promises.filter(t => !!t) as IToken[]
  //     }

  //     const rawMetadatas = await connection.getProgramAccounts(
  //       new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as StringPublicKey),
  //       {
  //         filters: [
  //           ...baseFilters,
  //           {
  //             memcmp: {
  //               offset: 1,
  //               bytes: '7gvSzhM46gNzXUyg7Lidmu8cEPkeVWrGyXsBMgKwyMmk',
  //             },
  //           },
  //         ],
  //       }
  //     )
  //     const alldata = await metadatasToTokens(rawMetadatas)
  //     debugger
  //     const tempArray: any[] = []
  //     for (const element of alldata) {
  //       const t = {
  //         pubkey: element.address.toBase58(),
  //         extradata: await getMoreData(
  //           element.address.toBase58(),
  //           element.metadataOnchain?.data.uri
  //         ),
  //         item: element,
  //       }
  //       tempArray.push(t)
  //     }
  //     let group = tempArray.reduce((r, a) => {
  //       r[a.extradata?.collection?.name] = [...(r[a.extradata?.collection?.name] || []), a]
  //       return r
  //     })
  //     delete group['extradata']
  //     delete group['item']
  //     delete group['pubkey']
  //     group = Object.keys(group).map(key => [group[key]])

  //     group = group.filter(elem => {
  //       return elem[0][0].extradata?.collection?.name == collectionName
  //     })

  //     setDataItems(group[0][0])

  //     setIsCollectionsLoading(false)
  //   }
  //   getUserItems()
  // }, [])

  // const getMoreData = async (id, itemuri) => {
  //   const USE_CDN = false
  //   const routeCDN = (uri: string) => {
  //     let result = uri
  //     if (USE_CDN) {
  //       result = uri.replace('https://arweave.net/', 'https://coldcdn.com/api/cdn/bronil/')
  //     }

  //     return result
  //   }

  //   if (itemuri) {
  //     const uri = routeCDN(itemuri)

  //     const processJson = (extended: any) => {
  //       if (!extended || extended?.properties?.files?.length === 0) {
  //         return
  //       }

  //       if (extended?.image) {
  //         const file = extended.image.startsWith('http')
  //           ? extended.image
  //           : `${itemuri}/${extended.image}`
  //         extended.image = routeCDN(file)
  //       }

  //       return extended
  //     }
  //     const data = await fetch(uri)
  //     const rdata = processJson(data.json())

  //     return rdata
  //   }
  // }

  // //////

  return (
    <div className={CollectionItemsClasses} {...restProps}>
      {/* <div className='flex py-[32px] gap-[8px] flex-wrap'>
=======
  //************Quick Buy */
  const wallet = useWallet()
  const connection = useConnection()

  const handleOnSubmit = async () => {
    console.log('=====Start Quick Buy====')
    console.log('wallet2 ', wallet)
    console.log('connection ', connection)

    /* ==Open the wallet -- faking 
    //let transaction = new Transaction(transactionCtorFields)
    //transaction.feePayer(wallet.publicKey?.toBase58)

    //const account = Keypair.generate()
    //signers.push(account)
    //const commitment: Commitment = 'singleGossip'
    //transaction.recentBlockhash = (await connection.getRecentBlockhash(commitment)).blockhash
    //transaction = await wallet.signTransaction(transaction)
*/

    const source = new PublicKey('8DJcBvckWKrtWCm8tDkwf1DYsCCizuVv2hdEVNRaSM5J')
    const destination: PublicKey = new PublicKey('CCUXh193UkUEfWqBf4NVw5hqhZFX443hhHWxmfpkywu3') //('8bSR11t4bN9QhhNVewJNyQhuz8xvRcdrD8JKHLGtN16V')
    const mint = new PublicKey('FWoEL7DXbYNkttQyB7QeYvYwft8PAMyVpAxpgsS5qwXm')
    const amount = 1
    const instructions: TransactionInstruction[] = []
    //const tx = [] as any
    const signers: Keypair[] = []
    const destAta = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      toPublicKey(destination)
    )
    console.log(
      'destAta.toBase58',
      destAta.toBase58(),
      'ASSOCIATED_TOKEN_PROGRAM_ID: ',
      ASSOCIATED_TOKEN_PROGRAM_ID,
      'TOKEN_PROGRAM_ID :',
      TOKEN_PROGRAM_ID.toString
    )
    const transactionCtorFields = {
      feePayer: wallet.publicKey,
    }

    console.log('Creating  Associate token', destination.toBase58)

    try {
      // check if the account exists
      await Account.load(connection, destAta)
    } catch {
      console.log('Creating  Associate token')
      /*
  instructions: TransactionInstruction[],
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: <PublicKey></PublicKey>*/

      await createAssociatedTokenAccountInstruction(
        instructions,
        destAta,
        wallet.publicKey,
        wallet.publicKey,
        toPublicKey(mint)
      )
    }

    /*
        static createTransferInstruction(
      programId: PublicKey,
      source: PublicKey,
      destination: PublicKey,
      owner: PublicKey,
      multiSigners: Array<Signer>,
      amount: number | u64,
    ): TransactionInstruction;
    */
    const owner = new PublicKey('8bSR11t4bN9QhhNVewJNyQhuz8xvRcdrD8JKHLGtN16V')
    //const multiSigners: Array<Signer> = ['asdf']
    instructions.push(
      Token.createTransferInstruction(TOKEN_PROGRAM_ID, source, destAta, owner, [], amount)
    )

    const { txid, slot } = await sendTransactionWithRetry(connection, wallet, instructions, signers)
    console.log('Transaction Approved ', txid, slot)

    /*transaction.setSigners(
      // fee payed by the wallet owner
      wallet2.publicKey.toBase58,
      ...signers.map(s => s.publicKey)
    )

    transaction = await wallet2.signTransaction(transaction)
*/
    /*await sendTransactionWithRetry(
      connection,
      w,
      [],
      [],

      'single'
    )*/
  }

  const sendToken = () => {
    // interface Wallet {
    //   publicKey: string//PublicKey
    //   signTransaction(tx: Transaction): Promise<Transaction>
    //  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>
    // }

    interface ISendTokenParams {
      connection: Connection
      /** Source wallet address **/
      wallet: Wallet
      /** Source wallet's associated token account address **/
      source: PublicKey
      /** Destination wallet address **/
      destination: PublicKey
      /** Mint address of the tokento transfer **/
      mint: PublicKey
      /** Amount of tokens to transfer. One important nuance to remember is that each token mint has a different amount of decimals, which need to be accounted while specifying the amount. For instance, to send 1 token with a 0 decimal mint you would provide `1` as the amount, but for a token mint with 6 decimals you would provide `1000000` as the amount to transfer one whole token **/
      amount: number | u64
    }

    /*interface SendTokenResponse {
    txId: string
  }*/

    //const { wallet, connect, connected } = useWallet()
    const connection: Connection = useConnection()
    //const wallet: Wallet = {publicKey:'', };
    const payer = Keypair.fromSecretKey(
      new Uint8Array([
        243, 8, 240, 18, 66, 160, 238, 238, 156, 176, 125, 105, 228, 116, 178, 107, 71, 26, 176, 95,
        29, 188, 239, 146, 45, 105, 33, 54, 99, 47, 90, 83, 125, 155, 203, 111, 156, 226, 156, 102,
        35, 114, 123, 76, 15, 208, 83, 199, 153, 212, 254, 96, 190, 114, 175, 80, 233, 182, 103, 83,
        68, 224, 184, 108,
      ])
    )

    // const w: WalletContextState = wallet2
    const wallet = new NodeWallet(payer)
    const source = new PublicKey('6MsvXcreTDzWZ69B2q8jyRkef8yQiuFHmWikyraJiERv')
    const destination = new PublicKey('8bSR11t4bN9QhhNVewJNyQhuz8xvRcdrD8JKHLGtN16V')
    const mint = new PublicKey('FWoEL7DXbYNkttQyB7QeYvYwft8PAMyVpAxpgsS5qwXm')
    const amount = 1
    const signers: Keypair[] = []
    const tokenParams: ISendTokenParams = {
      connection,
      wallet,
      source,
      destination,
      mint,
      amount,
    }
    //const sendTokenResponse = await actions.sendToken(tokenParams)
  }
  //****** End quick buy */

  return (
    <div className={CollectionItemsClasses} {...restProps}>
      <div className='flex flex-wrap gap-[8px] py-[32px]'>
>>>>>>> Stashed changes
        <Chip onClose={() => {}}>Buy Now</Chip>
        <Chip onClose={() => {}} label='Character'>
          Foxy belugie
        </Chip>
        <Chip onClose={() => {}} label='Price range'>
          ◎ .05 - ◎ .10
        </Chip>
        <Chip onClose={() => {}} label='Face'>
          Happy
        </Chip>
        <Chip onClose={() => {}} label='Shirt'>
          Beach
        </Chip>
        <Chip onClose={() => {}} label='Tier'>
          Professional
        </Chip>

        <button className='h-[32px] appearance-none rounded-full px-[8px] text-md font-500 text-B-400'>
          Clear all
        </button>
      </div> */}

      <div className='flex gap-[20px]'>
        {/* <TextField
          iconBefore={<i className='ri-search-2-line' />}
          placeholder='Search for traits, tags, item #s, and more...'
          size='sm'
        /> */}

        {/* <Dropdown className='w-[260px]'>
          {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
            const onSelectOption = (value: string) => {
              setIsOpen(false)
              setInnerValue(value)
            }

            const options = [
              { label: 'Art: A to Z', value: 'Art: A to Z' },
              { label: 'Art: Z to A', value: 'Art: Z to A' },
              {
                label: 'Price: Low to High',
                value: 'Price: Low to High',
              },
              {
                label: 'Price: High to Low',
                value: 'Price: High to Low',
              },
            ]

            return (
              <>
                <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                  <TextField
                    iconAfter={
                      isOpen ? (
                        <i className='ri-arrow-up-s-line' />
                      ) : (
                        <i className='ri-arrow-down-s-line' />
                      )
                    }
                    value={innerValue || 'Price: Low to High'}
                    readOnly
                    size='sm'
                  />
                </DropDownToggle>

                {isOpen && (
                  <DropDownBody
                    align='right'
<<<<<<< Updated upstream
                    className='w-full shadow-lg shadow-B-700/10 border border-B-10 mt-[8px]'>
=======
                    className='mt-[8px] w-full border border-B-10 shadow-lg shadow-B-700/10'>
>>>>>>> Stashed changes
                    {options?.map((option: any, index: number) => {
                      const { label, value } = option

                      return (
                        <DropDownMenuItem
                          key={index}
                          onClick={() => onSelectOption(value)}
                          {...option}>
                          {label}
                        </DropDownMenuItem>
                      )
                    })}
                  </DropDownBody>
                )}
              </>
            )
          }}
        </Dropdown> */}
      </div>

      <div className='grid grid-cols-4 gap-[28px] pt-[32px]'>
        {dataItems.map((art: any, index: number) => {
          const temp = {
            name: art?.extradata.name,
            image: art?.extradata.image,
            price: 100, //hardcoded
            bid: 10,
            lastPrice: 100,
          }
          return (
            <ArtCard
              onClickBuy={() => {
                setSelectedArt(temp)
                setShowQuickBuyModal(true)
              }}
              onClickDetails={() => {
                setSelectedArt(temp)
                setShowArtModalModal(true)
              }}
              key={index}
              {...temp}
            />
          )
        })}
      </div>

      {showQuickBuyModal && (
        <Modal heading='Complete order' onClose={() => setShowQuickBuyModal(false)}>
          {({ modalClose }: any) => {
            return (
              <>
                <QuickBuy
                  onSubmit={(e: any) => {
                    handleOnSubmit()
                    modalClose(e)
                    setShowQuickBuyModal(false)
                  }}
                  art={selectedArt}
                />
              </>
            )
          }}
        </Modal>
      )}

      {showArtModalModal && (
        <Modal onClose={() => setShowArtModalModal(false)} size='lg' isFixed={false}>
          {({ modalClose }: any) => {
            return (
              <>
                <ArtDetails
                  onSubmit={(e: any) => {
                    modalClose(e)
                    setShowArtModalModal(false)
                  }}
                  art={selectedArt}
                />
              </>
            )
          }}
        </Modal>
      )}
    </div>
  )
}

export default CollectionItems
