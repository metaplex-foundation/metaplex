import React from 'react'
import { Card, CardProps, Badge } from 'antd'
import { Button, MetadataCategory, StringPublicKey } from '@oyster/common'
import { ArtContent } from '../ArtContent'
import { useArt } from '../../hooks'
import { Artist, ArtType } from '../../types'
import { MetaAvatar } from '../MetaAvatar'
import { useHistory } from 'react-router-dom'

const { Meta } = Card

export interface ArtCardProps extends CardProps {
  pubkey?: StringPublicKey

  image?: string
  animationURL?: string

  category?: MetadataCategory

  name?: string
  symbol?: string
  description?: string
  creators?: Artist[]
  preview?: boolean
  small?: boolean
  onClose?: () => void

  height?: number
  artView?: boolean
  width?: number

  count?: string
}

export const ArtCard = (props: ArtCardProps) => {
  const {
    className,
    small,
    category,
    image,
    animationURL,
    preview,
    onClose,
    pubkey,
    height,
    artView,
    width,
    count,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    name: _name,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    creators: _creators,
    ...rest
  } = props
  const art = useArt(pubkey)
  let { name, creators } = props
  creators = art?.creators || creators || []
  name = art?.title || name || ' '

  let badge = ''
  if (art.type === ArtType.NFT) {
    badge = 'Unique'
  } else if (art.type === ArtType.Master) {
    badge = 'NFT 0'
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition} of ${art.supply}`
  }

  const { push } = useHistory()

  const card = (
    <div className='buy-card group flex w-full cursor-pointer flex-col overflow-hidden rounded bg-white shadow-card transition-all'>
      <div className='flex h-[286px] w-full overflow-hidden transition-all'>
        <ArtContent
          pubkey={pubkey}
          uri={image}
          animationURL={animationURL}
          category={category}
          preview={preview}
          height={height}
          width={width}
          artView={artView}
        />
      </div>
      <div className='flex flex-col rounded-b px-[20px] pt-[12px] pb-[20px] transition-all'>
        <h2 className='w-full border-b border-slate-100 pb-[8px] text-center text-h5'>{name}</h2>

        <div className='flex justify-between pt-[12px]'></div>

        <div className='flex w-full pt-[12px]'>
          <Button
            onClick={() => push(`/art/${pubkey}/sale`)}
            type='primary'
            className='action-btn w-full'>
            Put on sale
          </Button>
        </div>
        <div className='flex w-full pt-[12px]'>
          <Button
            onClick={() => push(`/art/${pubkey}/auction`)}
            appearance='neutral'
            className='w-full'>
            Put on auction
          </Button>
        </div>
      </div>
    </div>
  )

  return art.creators?.find(c => !c.verified) ? (
    <Badge.Ribbon text='Unverified'>{card}</Badge.Ribbon>
  ) : (
    card
  )
}
