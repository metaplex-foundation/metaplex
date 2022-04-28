import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { SectionHeading, LaunchCard } from '@oyster/common'
import { FeaturedLaunchCard } from '../../sections'
import { useHistory } from 'react-router-dom'
import { getFeaturedSubmission } from '../../../api'

export interface LaunchpadProps {
  [x: string]: any
}

const cards = [
  {
    id: 0,
    name: 'Dead Rejects',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fbafybeie73m6lnfdndoqll6w35klzfykflfhhcvmutvw7ig6zputz7e6tga.ipfs.nftstorage.link%2F365.png%3Fext%3Dpng&w=1920&q=75',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 1,
    name: 'Miners of Mars',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fbafybeietzwairdwnm3rkoc2rcnn5rjehtl76gs3d3aqy6ltofsauxzocq4.ipfs.nftstorage.link%2F4603.png%3Fext%3Dpng&w=1920&q=75',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 2,
    name: 'Everseed',
    image:
      'https://dl.airtable.com/.attachmentThumbnails/e435b9e1a178278258f79255bc7c4dbf/b0021a95',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 3,
    name: 'Mindfolk Pirates',
    image:
      'https://img-cdn.magiceden.dev/rs:fill:640:640:0:0/plain/https://www.arweave.net/eU7DjKk3-f45hp5SIE5tf0y6bRsw3tKaIkecjPa4mfc?ext=png',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 4,
    name: 'Dead Rejects',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fbafybeie73m6lnfdndoqll6w35klzfykflfhhcvmutvw7ig6zputz7e6tga.ipfs.nftstorage.link%2F365.png%3Fext%3Dpng&w=1920&q=75',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 5,
    name: 'Miners of Mars',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fbafybeietzwairdwnm3rkoc2rcnn5rjehtl76gs3d3aqy6ltofsauxzocq4.ipfs.nftstorage.link%2F4603.png%3Fext%3Dpng&w=1920&q=75',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 6,
    name: 'Everseed',
    image:
      'https://dl.airtable.com/.attachmentThumbnails/e435b9e1a178278258f79255bc7c4dbf/b0021a95',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
  {
    id: 7,
    name: 'Mindfolk Pirates',
    image:
      'https://img-cdn.magiceden.dev/rs:fill:640:640:0:0/plain/https://www.arweave.net/eU7DjKk3-f45hp5SIE5tf0y6bRsw3tKaIkecjPa4mfc?ext=png',
    volume: '472.54',
    price: 'Ⓞ 1.00 SOL',
    dollarValue: '$102.97',
    remainingTime: '20h : 35m : 08s',
  },
]

export const Launchpad: FC<LaunchpadProps> = ({ className, ...restProps }: LaunchpadProps) => {
  const { push } = useHistory()
  const LaunchpadClasses = CN(`launchpad container pt-[80px] pb-[100px]`, className)
  const [heading, setHeading] = useState('The Stoned Frogs')
  const [description, setDescription] = useState(
    'A collection of 8,400 Stoned Frogs coming to grow $SEEDS and take over the cannabis world.'
  )
  const [image, setImage] = useState('/img/frog.png')
  const [navigatePage, setNavigatePage] = useState('stoned-frogs')

  useEffect(() => {
    getFeaturedSubmission().then(submission => {
      setHeading(submission.collection_name)
      setDescription(submission.project_description)
      setImage(submission.collection_image_url)
      setNavigatePage(submission.collection_name_query_string.replace('%', '-').toLowerCase())
    })
  }, [])

  return (
    <div className={LaunchpadClasses} {...restProps}>
      <SectionHeading
        heading='Karmaplex Launchpad'
        align='center'
        headingClassName='text-display-md text-gray-900 font-400'
        description='Launching the most amazing projects by most <br/> amazing artists around the world.'
        descriptionClassName='text-gray-600 text-md'
      />

      <div className='pt-[80px]'>
        <FeaturedLaunchCard
          tagText='FEATURED LAUNCH'
          heading={heading}
          description={
            description && description.length >= 250
              ? `${description.slice(0, 250)}.....`
              : description
          }
          image={image}
          onClickButton={() => push(`/launchpad/${navigatePage}`)}
        />
      </div>

      <div className='pt-[80px]'>
        <SectionHeading overline='🤠 Promising' heading='Upcoming launches' />

        <div className='pt-[60px]'>
          <ul className='grid grid-cols-4 gap-[32px]'>
            {cards.map(({ id, name, image, price, dollarValue, remainingTime }, index) => (
              <li key={id || index}>
                <LaunchCard
                  name={name}
                  image={image}
                  price={price}
                  dollarValue={dollarValue}
                  onClickButton={() => {}}
                  remainingTime={remainingTime}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Launchpad
