import React, { FC } from 'react'
import { NFTCard, pubkeyToString, Button } from '@oyster/common'
import { useItems } from '../../../views/artworks/hooks/useItems'
import { ArtworkViewState, Item } from '../../../views/artworks/types'
import { useExtendedArt } from '../../../hooks'
import { useHistory } from 'react-router-dom'
// import { Button } from '../../../../../common/src/atoms/'

interface ProfileCollectiblesListProps {}
interface NFTCardWrapperProps {
  nft: Item
}

const NFTCardWrapper: FC<NFTCardWrapperProps> = ({ nft }) => {
  //@ts-ignore
  const pubkey = nft?.metadata.pubkey
  const id = pubkeyToString(pubkey)
  const { data } = useExtendedArt(id)
  const image = data?.image || ''
  const name = data?.name || ''

  const { push } = useHistory()
  return (
    <NFTCard
      hoverButtons={[
        <Button
          onClick={() => push(`/art/${pubkey}/sale`)}
          key='btn1'
          className='w-full'
          appearance='primary'
          isRounded={false}>
          Put on sale
        </Button>,
        <Button
          onClick={() => push(`/art/${pubkey}/auction`)}
          key='btn1'
          className='w-full'
          appearance='neutral'
          isRounded={false}>
          Put on auction
        </Button>,
      ]}
      image={image}
      title={name}
    />
  )
}

export const ProfileCollectiblesList: FC<ProfileCollectiblesListProps> = () => {
  const userItems = useItems({ activeKey: ArtworkViewState.Owned })

  return (
    <div className='profile-collectibles-list grid grid-cols-4 gap-[28px]'>
      {(userItems || []).map((i, key) => (
        <NFTCardWrapper nft={i} key={key} />
      ))}
    </div>
  )
}
