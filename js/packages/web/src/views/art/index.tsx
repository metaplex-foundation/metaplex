import React from 'react'
import { useParams } from 'react-router-dom'
import { useArt, useExtendedArt, useUserArts } from '../../hooks'
import { ArtContent } from '../../components/ArtContent'
import InstantSale from './InstantSale'
import { AuctionCategory } from '../auctionCreate/types'

export const ArtView = () => {
  const { id } = useParams<{ id: string }>()
  const items = useUserArts()
  const { data: collection } = useExtendedArt(id)
  const selected = [...(items || []).filter(i => i.metadata.pubkey === id)]
  const art = useArt(id)

  const getColName = () => {
    if (collection) {
      //@ts-ignore
      return collection.collection?.name || collection.name || null
    }
    return null
  }

  const collectionName = getColName()

  return (
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
                <h6 className='text-h6 font-400'>Instant Sale</h6>
                {!!selected.length && (
                  <InstantSale category={AuctionCategory.InstantSale} items={selected} />
                )}
                <hr />
                <h6 className='text-h6 font-400'>Auction</h6>
                {!!selected.length && (
                  <InstantSale category={AuctionCategory.Tiered} items={selected} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
