import React, { useState } from 'react'
import { Layout, Tag } from 'antd'
import { Button } from '@oyster/common'
import { useParams } from 'react-router-dom'
import { useArt, useExtendedArt } from '../../hooks'

import { ArtContent } from '../../components/ArtContent'
import { shortenAddress, SOLIcon, useConnection } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { MetaAvatar } from '../../components/MetaAvatar'
import { sendSignMetadata } from '../../actions/sendSignMetadata'
import { ViewOn } from '../../components/ViewOn'
import { ArtType } from '../../types'
import { ArtMinting } from '../../components/ArtMinting'
import PutOnSale from './PutOnSale'

export const ArtView = () => {
  const { id } = useParams<{ id: string }>()
  const wallet = useWallet()
  const [remountArtMinting, setRemountArtMinting] = useState(0)

  const connection = useConnection()
  const art = useArt(id)
  let badge = ''
  let maxSupply = ''
  if (art.type === ArtType.NFT) {
    badge = 'Unique'
  } else if (art.type === ArtType.Master) {
    badge = 'NFT 0'
    if (art.maxSupply !== undefined) {
      maxSupply = art.maxSupply.toString()
    } else {
      maxSupply = 'Unlimited'
    }
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition} of ${art.supply}`
  }
  const { ref, data } = useExtendedArt(id)

  // const { userAccounts } = useUserAccounts();

  // const accountByMint = userAccounts.reduce((prev, acc) => {
  //   prev.set(acc.info.mint.toBase58(), acc);
  //   return prev;
  // }, new Map<string, TokenAccount>());

  const description = data?.description
  const attributes = data?.attributes

  const pubkey = wallet?.publicKey?.toBase58() || ''

  const tag = (
    <div className='info-header'>
      <Tag color='blue'>UNVERIFIED</Tag>
    </div>
  )

  const unverified = (
    <>
      {tag}
      <div style={{ fontSize: 12 }}>
        <i>
          This artwork is still missing verification from{' '}
          {art.creators?.filter(c => !c.verified).length} contributors before it can be considered
          verified and sellable on the platform.
        </i>
      </div>
      <br />
    </>
  )

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
                </div>

                <div className='text-sm font-500 text-B-400'>
                  {(art.creators || []).map((creator, idx) => {
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: 5,
                        }}>
                        <MetaAvatar creators={[creator]} size={64} />
                        <div>
                          <span className='creator-name'>
                            {creator.name || shortenAddress(creator.address || '')}
                          </span>
                          <div style={{ marginLeft: 10 }}>
                            {!creator.verified &&
                              (creator.address === pubkey ? (
                                <Button
                                  onClick={async () => {
                                    try {
                                      await sendSignMetadata(connection, wallet, id)
                                    } catch (e) {
                                      console.error(e)
                                      return false
                                    }
                                    return true
                                  }}>
                                  Approve
                                </Button>
                              ) : (
                                tag
                              ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className='flex flex-col gap-[12px]'>
                  <h5 className='text-h6 font-400'>Max supply</h5>
                  <div className='flex items-center gap-[8px]'>
                    <SOLIcon size={24} />
                    <h4 className='text-h4 font-600 leading-[1]'>{maxSupply}</h4>
                    {/* <span className='ml-[4px] text-lg text-slate-500'>{1}</span> */}
                  </div>
                </div>
                <PutOnSale />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
