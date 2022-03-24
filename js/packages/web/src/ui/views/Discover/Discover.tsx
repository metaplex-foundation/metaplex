import React, { FC } from 'react'
import CN from 'classnames'
import {
  SectionHeading,
  SearchField,
  Dropdown,
  DropDownToggle,
  Button,
  DropDownBody,
  DropDownMenuItem,
  BuyCard,
  Pagination,
} from '@oyster/common'

export interface DiscoverProps {
  [x: string]: any
}

const cards = [
  {
    id: 0,
    name: 'Bothered Otter',
    url: '#',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fwww.arweave.net%2FyuhwGghXfOkPw6Qk73aMQs7bYYISBpa2LLiScFjaYPo%3Fext%3Dpng&w=1920&q=75Î',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 1,
    name: 'Mean Pigs',
    url: '#',
    image: '/img/temp/nft9.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 2,
    name: 'Bohomia',
    url: '#',
    image: '/img/temp/nft10.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 3,
    name: 'Sad Sea',
    url: '#',
    image: '/img/temp/nft11.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 4,
    name: 'Belugies',
    url: '#',
    image: '/img/temp/nft1.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 5,
    name: 'Mean Pigs',
    url: '#',
    image: '/img/temp/nft3.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 6,
    name: 'Bohomia',
    url: '#',
    image: '/img/temp/nft4.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 7,
    name: 'Sad Sea',
    url: '#',
    image: '/img/temp/nft2.png',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 8,
    name: 'Sol Dad',
    url: '#',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fwww.arweave.net%2FEOWKY7hz95x2cj9S7IN72cuRDdkvByPVQNyBUnJ6oR4%3Fext%3Dpng&w=1920&q=75',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 9,
    name: 'Blockchain Billy',
    url: '#',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Farweave.net%2F_wUHu496N4qSOwee3N5lOqYyiFRXdEdahLpayxSEOVw%3Fext%3Djpg&w=1920&q=75',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 10,
    name: 'Samoyed',
    url: '#',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Farweave.net%2F5XfG1aseTE616bfkzeDtdl53Py-CA9mFAKoCgj-hdLE&w=1920&q=75',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 11,
    name: 'Jungle Cat Lioness',
    url: '#',
    image:
      'https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Farweave.net%2F61rA9QIYA-eJcfYJadyKMrCJ41Svk3T0uycfXt8N9Bw%3Fext%3Djpeg&w=1920&q=75',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 13,
    name: 'Lady Yetis',
    url: '#',
    image: '/img/temp/nft5.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 14,
    name: 'Diamond Hands',
    url: '#',
    image: '/img/temp/nft13.gif',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 15,
    name: 'Dapper Ape',
    url: '#',
    image: '/img/temp/nft8.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
  {
    id: 16,
    name: 'Sad Sea',
    url: '#',
    image: '/img/temp/nft11.webp',
    volume: '472.54',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    hint: '$154.00',
  },
]

export const Discover: FC<DiscoverProps> = ({ className, ...restProps }: DiscoverProps) => {
  const DiscoverClasses = CN(`discover container`, className)

  return (
    <div className={DiscoverClasses} {...restProps}>
      <div className='flex flex-col items-center justify-center gap-[40px] pt-[80px]'>
        <SectionHeading
          commonClassName='!flex items-center !justify-center !text-center w-full'
          headingClassName='text-display-md'
          heading='Discover collections'
          description='Explore 2000+ outstanding NFTs collections done by hundreds of <br/> creatives around the world.'
          descriptionClassName='!text-md'
        />

        <div className='flex items-center gap-[12px]'>
          <SearchField
            className='w-[528px]'
            size='lg'
            placeholder='Search by collection name'
            actions={
              <Dropdown>
                {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
                  const onSelectOption = (value: string) => {
                    setInnerValue(value)
                    setIsOpen(false)
                  }

                  const options = [
                    { label: 'Recent', value: 'Recent' },
                    { label: 'Price: Low to High', value: 'Price: Low to High' },
                    { label: 'Price High to Low', value: 'Price High to Low' },
                  ]

                  return (
                    <>
                      <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                        <Button
                          appearance='ghost'
                          iconBefore={<i className='ri-filter-3-line text-[20px] font-400' />}
                          className='focus!shadow-none focus!border-0'>
                          {innerValue || 'Recent'}
                        </Button>
                      </DropDownToggle>

                      {isOpen && (
                        <DropDownBody align='right' className='mt-[12px] w-[200px]'>
                          {options.map((option: any, index: number) => {
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
            }
          />

          <Button appearance='neutral' size='lg' className='h-[52px] w-[160px]'>
            Search
          </Button>
        </div>
      </div>

      <div className='container pt-[80px]'>
        <ul className='grid grid-cols-4 gap-[32px]'>
          {cards.map(({ id, name, image, volume, floorPrice, hint }, index) => (
            <li key={id || index}>
              <BuyCard
                hasButton={false}
                name={name}
                image={image}
                volume={volume}
                floorPrice={floorPrice}
                dollarValue={hint}
              />
            </li>
          ))}
        </ul>

        <div className='flex justify-center py-[80px]'>
          <Pagination
            prevLink='#'
            nextLink='#'
            pages={[
              {
                label: '1',
                isActive: true,
                link: '#',
              },
              {
                label: '2',
                isActive: false,
                link: '#',
              },
              {
                label: '3',
                isActive: false,
                link: '#',
              },
              {
                label: '...',
                isActive: false,
                isDisabled: true,
                link: '#',
              },
              {
                label: '20',
                isActive: false,
                link: '#',
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default Discover
