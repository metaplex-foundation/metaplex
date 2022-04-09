import React, { FC, useEffect, useState } from 'react'
import {
  SectionHeading,
  SearchField,
  Dropdown,
  DropDownToggle,
  Button,
  DropDownBody,
  DropDownMenuItem,
  Pagination,
} from '@oyster/common'
import { Link, useLocation } from 'react-router-dom'
import queryString from 'query-string'
import { CollectionView, useNFTCollections } from '../../../hooks/useCollections'
import CollectionCard from '../../sections/RecentCollections/CollectionCard'
import useSearch from '../../../hooks/useSearch'

export interface DiscoverProps {}

interface SearchParamsInterface {
  searchText?: string
  page?: string
}

export const Discover: FC<DiscoverProps> = () => {
  const { liveCollections } = useNFTCollections()
  const [collections, setCollections] = useState<CollectionView[]>([])

  const { search } = useLocation()
  const { searchText, page }: SearchParamsInterface = queryString.parse(search) || {}
  const { onChangeSearchText, searchText: text, onSubmitSearch } = useSearch()
  const [current, setCurrent] = useState(0)
  const [showPagination, setShowPagination] = useState(false)

  const { pathname } = useLocation()

  useEffect(() => {
    setCurrent(page ? Number(page) - 1 : 0)
  }, [page])

  useEffect(() => {
    const paginatedCollection = paginate([
      ...liveCollections
        .map(col => {
          return {
            ...col,
            name: col.data.data.name,
          }
        })
        .filter(filterFun),
    ])
    if (paginatedCollection.length > 0) {
      setShowPagination(true)
    }
    setCollections(
      paginatedCollection.length && !!paginatedCollection[current]
        ? paginatedCollection[current]
        : []
    )
  }, [liveCollections, searchText, current])

  const paginate = array => {
    const chunkSize = 30
    const chunks: Array<any> = []
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize)
      chunks.push(chunk)
    }
    return chunks
  }

  const filterFun = (col: any) => {
    if (!searchText) {
      return true
    }
    return col.name.toLowerCase().includes(searchText.toLowerCase())
  }

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      onSubmitSearch(event)
    }
  }
  const getPagination = () => {
    return paginate([
      ...liveCollections
        .map(col => {
          return {
            ...col,
            name: col.data.data.name,
          }
        })
        .filter(filterFun),
    ]).map((i, key) => {
      return {
        label: `${key + 1}`,
        isActive: key === current,
        link: `${pathname}?${new URLSearchParams({
          searchText: searchText ?? '',
          page: `${key + 1}`,
        }).toString()}`,
      }
    })
  }

  return (
    <div className='discover container'>
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
            value={text}
            onChange={onChangeSearchText}
            onKeyPress={handleKeyPress}
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

          <Button
            onClick={onSubmitSearch}
            appearance='neutral'
            size='lg'
            className='h-[52px] w-[160px]'>
            Search
          </Button>
        </div>
      </div>

      <div className='container pt-[80px]'>
        <ul className='grid grid-cols-4 gap-[32px]'>
          {(collections || []).map((collection: any) => (
            <li key={collection.pubkey}>
              <Link to={`/collection/${collection.mint ?? collection.name}`}>
                <CollectionCard hasButton={false} collection={collection} />
              </Link>
            </li>
          ))}
        </ul>

        {showPagination && (
          <div className='flex justify-center py-[80px]'>
            <Pagination
              prevLink={
                current > 0
                  ? `${pathname}?${new URLSearchParams({
                      searchText: searchText ?? '',
                      page: `${current}`,
                    }).toString()}`
                  : `${pathname}?${new URLSearchParams({
                      searchText: searchText ?? '',
                      page: `${current + 1}`,
                    }).toString()}`
              }
              nextLink={
                getPagination().length >= current + 2
                  ? `${pathname}?${new URLSearchParams({
                      searchText: searchText ?? '',
                      page: `${current + 2}`,
                    }).toString()}`
                  : `${pathname}?${new URLSearchParams({
                      searchText: searchText ?? '',
                      page: `${current + 1}`,
                    }).toString()}`
              }
              pages={getPagination()}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Discover
