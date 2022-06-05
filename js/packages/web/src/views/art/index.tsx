import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useArt, useExtendedArt, useUserArts } from '../../hooks'
import { ArtContent } from '../../components/ArtContent'
import InstantSale from './InstantSale'
import { AuctionCategory } from '../auctionCreate/types'
import { Creator, Modal, useUserAccounts } from '@oyster/common'
import { CheckCircleOutlined, IssuesCloseOutlined, LoadingOutlined } from '@ant-design/icons'
import { Spin } from 'antd'

export const PROCESSING = 1
export const SUCCESS = 2
export const ERROR = 3

export const ArtView = () => {
  const { id } = useParams<{ id: string }>()
  const items = useUserArts()
  const { data: collection } = useExtendedArt(id)
  const selected = [...(items || []).filter(i => i.metadata.pubkey === id)]
  const art = useArt(id)
  console.log('art', art)
  console.log('selected', selected)
  const [status, setStatus] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const { ref, data } = useExtendedArt(id)
  const { accountByMint } = useUserAccounts()
  const a = accountByMint.get(art.mint as string)

  console.log('accountByMint', accountByMint)
  console.log('mint', art.mint)
  console.log('holder', a?.pubkey)
  const candyNft = art
  useEffect(() => {
    if (status) {
      setShowModal(true)
    }
  }, [status])

  const getColName = () => {
    if (collection) {
      //@ts-ignore
      return collection.collection?.name || collection.name || null
    }
    return null
  }

  const collectionName = getColName()

  const getModalContent = () => {
    switch (status) {
      case PROCESSING:
        return (
          <>
            <Spin indicator={<LoadingOutlined style={{ fontSize: '80px' }} />} />
            <h2 className='mt-10 text-center text-h2 font-400	 text-slate-800'>
              Your item is processing
            </h2>
          </>
        )
      case SUCCESS:
        return (
          <>
            <CheckCircleOutlined style={{ fontSize: '80px' }} />
            <h2 className='mt-10 text-center text-h2 font-400	 text-slate-800'>Congratulations</h2>
            <div className='flex justify-center'>
              <a
                className='mt-10 w-1/4 rounded bg-blue-500 py-2 px-4 text-center font-bold text-white hover:bg-blue-700'
                href='#/profile'>
                RELOAD
              </a>
            </div>
          </>
        )
      case ERROR:
        return (
          <>
            <IssuesCloseOutlined style={{ fontSize: '80px' }} />
            <h2 className='mt-10 text-center text-h2 font-400	 text-slate-800'>
              Something went wrong
            </h2>
            <div className='flex justify-center'>
              <a
                onClick={() => {
                  setShowModal(false)
                  setStatus(0)
                }}
                className='mt-10 w-1/4 rounded bg-blue-500 py-2 px-4 text-center font-bold text-white hover:bg-blue-700'>
                CLOSE
              </a>
            </div>
          </>
        )
      default:
        return <></>
    }
  }

  return (
    <>
      <div className='nft-details w-full'>
        <div className='nft-details-body w-full pb-[100px]'>
          <div className='container flex gap-[40px] rounded border border-slate-200 bg-white p-[40px] shadow-card-light'>
            <div className='sidebar flex w-[400px] flex-shrink-0 flex-col gap-[40px]'>
              <span className='w-full overflow-hidden rounded-[8px]'>
                <ArtContent
                  style={{ width: '100%', height: 'auto', margin: '0 auto' }}
                  height={300}
                  width={300}
                  className='artwork-image'
                  pubkey={id}
                  active={true}
                  allowMeshRender={true}
                  artView={true}
                />
              </span>
            </div>
            <div className='content flex w-full flex-col'>
              <div className='flex flex-col gap-[28px]'>
                <div className='flex flex-col gap-[16px]'>
                  <div className='flex flex-col gap-[4px]'>
                    <h2 className='text-h2 font-500 text-slate-800'>{art.title}</h2>
                    {collectionName && (
                      <div className='flex items-center gap-[4px]'>
                        <h6 className='text-h6 font-400'>{collectionName}</h6>
                        <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
                      </div>
                    )}
                  </div>
                  <>
                    <h6 className='text-h6 font-400'>Instant Sale</h6>
                    <InstantSale
                      setStatus={setStatus}
                      category={AuctionCategory.InstantSale}
                      items={selected}
                      candyNft={null}
                      status={status}
                      mintKey={art.mint as string}
                    />
                  </>
                  {/* {!!selected.length &&
                    !(selected[0].metadata.info.data.creators || []).some(
                      (c: Creator) => !c.verified
                    ) && (
                      <>
                        <h6 className='text-h6 font-400'>Instant Sale</h6>
                        <InstantSale
                          setStatus={setStatus}
                          category={AuctionCategory.InstantSale}
                          items={selected}
                          status={status}
                          mintKey={art.mint as string}
                        />
                      </>
                    )} */}
                  <hr />
                  <>
                    <h6 className='text-h6 font-400'>Create Auction for this NFT</h6>
                    <InstantSale
                      setStatus={setStatus}
                      category={AuctionCategory.Tiered}
                      items={selected}
                      status={status}
                      mintKey={art.mint as string}
                      candyNft={null}
                    />
                  </>
                  {/* {!!selected.length &&
                    !!selected[0]?.masterEdition &&
                    selected[0]?.masterEdition.info.maxSupply === undefined && (
                      <>
                        <h6 className='text-h6 font-400'>Auction</h6>
                        <InstantSale
                          setStatus={setStatus}
                          category={AuctionCategory.Tiered}
                          items={selected}
                          status={status}
                          mintKey={art.mint as string}
                        />
                      </>
                    )} */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <Modal>
          <div className='flex flex-col justify-center	 p-5	'>{getModalContent()}</div>
        </Modal>
      )}
    </>
  )
}
