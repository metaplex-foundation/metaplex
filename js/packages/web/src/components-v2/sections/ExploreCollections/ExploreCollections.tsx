import React, { useEffect, useState, FC, useCallback } from 'react'
import { Link, useHistory, useLocation } from 'react-router-dom'
import CN from 'classnames'
import queryString from 'query-string'
import _ from 'lodash'
import {
  Spinner,
  useViewport,
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
  Button,
} from '@oyster/common'
import { categories } from '../../../../dummy-data/categories'
import { TextField } from '../../atoms/TextField'
import { TabHighlightButton } from '../../atoms/TabHighlightButton'
import { NftCard } from '../../molecules/NftCard'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { useExtendedCollection } from '../../../hooks'
import useSearch from '../../../hooks/useSearch'

export interface ExploreCollectionsProps {
  [x: string]: any
}

interface SearchParamsInterface {
  pid?: string
  searchText?: string
}

export const ExploreCollections: FC<ExploreCollectionsProps> = ({
  className,
  ...restProps
}: ExploreCollectionsProps) => {
  const ExploreCollectionsClasses = CN(`explore-collections py-[40px] lg:py-[80px]`, className)
  const { push } = useHistory()
  const { search } = useLocation()
  const { pid, searchText }: SearchParamsInterface = queryString.parse(search) || {}
  const { onChangeSearchText, searchText: text, onSubmitSearch } = useSearch()
  const [isCollectionsLoading, setIsCollectionsLoading] = useState(true)
  const { isMobile } = useViewport()

  const [dataItems, setDataItems] = useState<any[]>([])
  const { getData } = useExtendedCollection()

  const { auctions } = useAuctionsList()

  useEffect(() => {
    setIsCollectionsLoading(true)
    const newArray: any[] = []
    if (auctions.length > 0) {
      auctions.reduce((r, a) => {
        newArray.push([a as any])
        return r
      })
    }
    const grouped = _.mapValues(
      _.groupBy(newArray, item => item[0].thumbnail.metadata.info.data.creators[0].address)
    )
    const groups = _.values(grouped)

    setCollections(groups)
  }, [auctions, searchText])

  const setCollections = useCallback(
    groups => {
      Promise.all(groups.map(async group => await getData(group))).then(res => {
        setDataItems(() => searchNFTByName(res, searchText))
        setIsCollectionsLoading(false)
      })
    },
    [auctions, searchText]
  )

  const searchNFTByName = (collections, text: any) => {
    if (!text) {
      return collections
    }
    const searchText = text.toLowerCase()
    return collections.filter(({ collection }) => {
      return collection?.name?.toLowerCase().includes(searchText)
    })
  }

  const onChangeTabItem = value => {
    if (searchText) {
      push(`/explore?pid=${value}&searchText=${searchText}`)
      return
    }
    push(`/explore?pid=${value}`)
  }

  return (
    <div className={ExploreCollectionsClasses} {...restProps}>
      <div className='container flex flex-col items-center'>
        <h1 className='text-center text-h2 font-500'>
          Explore <br className='md:hidden' />
          collections
        </h1>

        <form
          onSubmit={e => onSubmitSearch(e, pid)}
          name='search'
          className='mb:pb-0 flex w-full max-w-[480px] pt-[20px] pb-[20px]'>
          <TextField
            value={text}
            onChange={onChangeSearchText}
            iconBefore={<i className='ri-search-2-line' />}
            placeholder='Search..'
            size='sm'
            wrapperClassName='!border-transparent !bg-gray-100 !w-full focus-within:!bg-white'
          />
        </form>

        {isMobile && (
          <Dropdown className='mb-[20px] w-full max-w-[480px]'>
            {({ isOpen, setIsOpen, innerValue, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                setInnerValue(value)
                setIsOpen(false)
              }

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <Button
                      appearance='secondary'
                      view='outline'
                      size='md'
                      iconAfter={<i className='ri-arrow-down-s-line flex' />}
                      className='w-full border-gray-200'>
                      {innerValue ? `Filter: ${innerValue}` : 'Filter collections'}
                    </Button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align='center'
                      className='w-full border-x border-b border-B-10 shadow-lg shadow-B-700/5'>
                      {categories?.map(({ label, value }: any, index: number) => {
                        return (
                          <>
                            <DropDownMenuItem
                              isActive={pid === value}
                              key={value || index}
                              onClick={() => {
                                onChangeTabItem(value)
                                onSelectOption(label)
                              }}>
                              {label}
                            </DropDownMenuItem>
                          </>
                        )
                      })}
                    </DropDownBody>
                  )}
                </>
              )
            }}
          </Dropdown>
        )}

        {!isMobile && (
          <div className='flex gap-[16px] pt-[40px] pb-[80px] lg:gap-[32px]'>
            {categories?.map(({ label, value }: any, index: number) => {
              return (
                <TabHighlightButton
                  isActive={pid === value}
                  key={value || index}
                  onClick={() => {
                    onChangeTabItem(value)
                  }}>
                  {label}
                </TabHighlightButton>
              )
            })}
          </div>
        )}

        {isCollectionsLoading && (
          <div className='flex min-h-[396px] w-full justify-center'>
            <Spinner color='#448fff' size={40} />
          </div>
        )}

        {!isCollectionsLoading && (
          <div className='grid grid-cols-1 gap-x-[32px] gap-y-[32px] pb-[100px] md:grid-cols-3 lg:grid-cols-4'>
            {pid === 'trending' &&
              dataItems.map((item: any) => {
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item.length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'collectibles' &&
              dataItems.map((item: any) => {
                console.log(item[0][0].thumbnail.metadata.pubkey)
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item.length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'art' &&
              dataItems.map((item: any) => {
                console.log(item[0][0].thumbnail.metadata.pubkey)
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item[0].length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'charity' &&
              dataItems.map((item: any) => {
                console.log(item[0][0].thumbnail.metadata.pubkey)
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item.length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'gaming' &&
              dataItems.map((item: any) => {
                console.log(item[0][0].thumbnail.metadata.pubkey)
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item.length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}

            {pid === 'utility' &&
              dataItems.map((item: any) => {
                console.log(item)
                const temp = {
                  pubkey: item[0][0].thumbnail.metadata.pubkey,
                  itemsCount: item.length,
                }
                return (
                  <Link
                    key={item[0][0].thumbnail.metadata.pubkey}
                    to={`/collection?collection=${item[0][0].thumbnail.metadata.info.data.creators[0].address}`}>
                    <NftCard {...temp} />
                  </Link>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExploreCollections
