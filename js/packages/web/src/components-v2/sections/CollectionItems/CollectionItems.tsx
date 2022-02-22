import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Chip } from '../../atoms/Chip'
import { TextField } from '../../atoms/TextField'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'
import { ArtCard } from '../../molecules/ArtCard'
import { Modal } from '../../molecules/Modal'
import { ArtDetails } from '../../molecules/ArtDetails'
import { QuickBuy } from '../../sections/QuickBuy'

import { arts } from '../../../../dummy-data/arts'
import { actions, NodeWallet, Wallet } from '@metaplex/js'
//import { Crypto } from '@metaplex/js/lib/utils/'
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

import { createAssociatedTokenAccountInstruction, toPublicKey } from '@oyster/common'
import { Account } from '@metaplex-foundation/mpl-core'
export interface CollectionItemsProps {
  [x: string]: any
}

export const CollectionItems: FC<CollectionItemsProps> = ({
  className,
  ...restProps
}: CollectionItemsProps) => {
  const CollectionItemsClasses = CN(`collection-items w-full`, className)
  const [showQuickBuyModal, setShowQuickBuyModal] = useState<boolean>(false)
  const [showArtModalModal, setShowArtModalModal] = useState<boolean>(false)
  const [selectedArt, setSelectedArt] = useState<any>(null)

  //************Quick Buy */

  const connection = useConnection()
  const wallet = useWallet()
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
    const destination: PublicKey = new PublicKey('DtSJHek4nczcEaoZ4b3dzEmupGJ9p5KjV7w6KNXpHiVu') //('8bSR11t4bN9QhhNVewJNyQhuz8xvRcdrD8JKHLGtN16V')
    const mint = new PublicKey('FWoEL7DXbYNkttQyB7QeYvYwft8PAMyVpAxpgsS5qwXm')

    const owner = wallet.publicKey as PublicKey

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

      createAssociatedTokenAccountInstruction(
        instructions,
        destAta,
        owner,
        owner,
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
    //const owner = wallet.publicKey?wallet.publicKey
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
      <div className='flex flex-wrap gap-[8px] pt-[16px] pb-[16px] md:py-[32px]'>
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
      </div>

      <div className='flex flex-col gap-[12px] md:flex-row md:gap-[20px]'>
        <TextField
          iconBefore={<i className='ri-search-2-line' />}
          placeholder='Search for traits, tags, item #s, and more...'
          size='sm'
        />

        <Dropdown className='w-full md:w-[260px]'>
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
                    className='mt-[8px] w-full border border-B-10 shadow-lg shadow-B-700/10'>
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
        </Dropdown>
      </div>

      <div className='grid grid-cols-2 gap-[16px] pt-[32px] md:grid-cols-3 md:gap-[28px] lg:grid-cols-4'>
        {arts.map((art: any, index: number) => {
          return (
            <ArtCard
              onClickBuy={() => {
                setSelectedArt(art)
                setShowQuickBuyModal(true)
              }}
              onClickDetails={() => {
                setSelectedArt(art)
                setShowArtModalModal(true)
              }}
              key={index}
              {...art}
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
                    handleOnSubmit()
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
