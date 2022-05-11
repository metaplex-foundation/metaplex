import React, { FC, useEffect } from 'react'
import { NFTCard, pubkeyToString, toPublicKey } from '@oyster/common'
import { useItems } from '../../../views/artworks/hooks/useItems'
import { ArtworkViewState, Item } from '../../../views/artworks/types'
import { useExtendedArt } from '../../../hooks'
import { Link, useParams } from 'react-router-dom'

interface ProfileCollectiblesListProps {
  setTag: (tag: string) => void
}
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

  return (
    <Link to={`/art/${pubkey}`}>
      <NFTCard link={`/art/${pubkey}`} image={image} title={name} />
    </Link>
  )
}

export const ProfileCollectiblesList: FC<ProfileCollectiblesListProps> = ({ setTag }) => {
  const { id } = useParams<{ id: string }>()
  const userItems = useItems({ activeKey: ArtworkViewState.Owned, userPublicKey: toPublicKey(id) })

  useEffect(() => {
    if (userItems) {
      setTag(`${userItems.length} NFTs`)
    }
  }, [userItems.length])

  return (
    <div className='profile-collectibles-list grid grid-cols-4 gap-[28px]'>
      {(userItems || []).map((i, key) => (
        <NFTCardWrapper nft={i} key={key} />
      ))}
    </div>
  )
}
