import React, { FC, useEffect, useState } from 'react'
import { SectionHeading, SearchField, Button, Pagination } from '@oyster/common'
import { Link, useLocation } from 'react-router-dom'
import queryString from 'query-string'
import {
  CollectionView,
  useAhNFTCollections,
  useNFTCollections,
} from '../../../hooks/useCollections'
import CollectionCard from '../../sections/RecentCollections/CollectionCard'
import useSearch from '../../../hooks/useSearch'
import { useExtendedCollection } from '../../../hooks'

export interface DiscoverProps {
  tags: any[]
}

interface SearchParamsInterface {
  searchText?: string
  page?: string
}

export const Discover: FC<DiscoverProps> = ({ tags }) => {
  const { liveCollections } = useAhNFTCollections()
  const [collections, setCollections] = useState<CollectionView[]>([])

  const { search } = useLocation()
  const { searchText, page }: SearchParamsInterface = queryString.parse(search) || {}
  const { onChangeSearchText, searchText: text, onSubmitSearch } = useSearch()

  const [current, setCurrent] = useState(0)
  const [showPagination, setShowPagination] = useState(false)
  const [colMeta, setColMeta] = useState<any[]>([])

  const { pathname } = useLocation()
  const { getData } = useExtendedCollection()

  console.log('liveCollections', liveCollections)

  useEffect(() => {
    if (liveCollections) {
      if ((liveCollections as any[]).length) {
        const colData: any[] = []
        ;(liveCollections as any[]).forEach(element => {
          getData(element.pubkey).then(res => {
            const data = { name: res?.collection?.name ?? res.name, pubkey: element.pubkey }
            const searchStrings =
              tags.find(i => data.name === i.collection_name_query_string) || null
            let searchString: string = data.name + ' '
            if (searchStrings?.tags?.length) {
              searchString += searchStrings.tags.join(' ')
            }
            colData.push({ ...data, searchString })
          })
        })
        setColMeta(colData)
      }
    }
  }, [liveCollections, tags?.length])

  useEffect(() => {
    setCurrent(page ? Number(page) - 1 : 0)
  }, [page])

  useEffect(() => {
    if (colMeta.length) {
      const paginatedCollection = paginate([
        ...(liveCollections as any[])
          .map(col => {
            const collectionName = colMeta.find(({ pubkey }) => pubkey === col.pubkey)?.name || ''
            const searchString =
              colMeta.find(({ pubkey }) => pubkey === col.pubkey)?.searchString || ''
            return {
              ...col,
              name: collectionName,
              searchString,
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
    }
  }, [liveCollections, searchText, current, colMeta.length])

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
    console.log('searchText', searchText)
    if (!searchText) {
      return true
    }
    console.log('col.searchString', col.searchString)
    return col.searchString.toLowerCase().includes(searchText.toLowerCase())
  }

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      onSubmitSearch(event)
    }
  }

  // console.log('colMeta', colMeta)

  const getPagination = () => {
    return paginate([
      ...(liveCollections as any[])
        .map(col => {
          const collectionName = colMeta.find(({ pubkey }) => pubkey === col.pubkey)?.name || ''
          const searchString =
            colMeta.find(({ pubkey }) => pubkey === col.pubkey)?.searchString || ''
          return {
            ...col,
            name: collectionName,
            searchString,
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
            placeholder='Search by collection name or tags'
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
