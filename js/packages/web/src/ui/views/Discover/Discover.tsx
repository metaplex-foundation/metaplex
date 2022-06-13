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
import { getNFTGroupedByCollection } from '../../../api/ahListingApi'

export interface DiscoverProps {
  tags: any[]
}

interface SearchParamsInterface {
  searchText?: string
  page?: string
}

export const Discover: FC<DiscoverProps> = ({ tags }) => {
  const [liveCollections, setLiveCollections] = useState<any[]>()

  const { search } = useLocation()
  // const { searchText, page }: SearchParamsInterface = queryString.parse(search) || {}
  // const { onChangeSearchText, searchText: text, onSubmitSearch } = useSearch()
  const params = new URLSearchParams(search)
  const searchValue = params.get('searchText')
  const [current, setCurrent] = useState(0)
  const [showPagination, setShowPagination] = useState(false)
  const [colMeta, setColMeta] = useState<any[]>([])
  const [text, setText] = useState('')
  const { pathname } = useLocation()
  const { getData } = useExtendedCollection()
  const [filteredCollections, setFilteredCollections] = useState<any[]>()

  useEffect(() => {
    const fetchData = async () => {
      await getCollections()
    }
    fetchData().catch(console.error)
  }, [])

  const getCollections = async () => {
    let collections: any[] = await getNFTGroupedByCollection()
    console.log('collections', collections)
    setLiveCollections(collections)
    setFilteredCollections(collections)
    debugger
    if (searchValue) {
      setText(searchValue)
    }
  }
  const tagAvailableColName = (colName, search) => {
    const val = tags.find(elem => elem.tags.find(el => el.toLowerCase() == search.toLowerCase()))
    if (!!val) {
      return colName.includes(val.collection_name_query_string)
    }
    return false
  }

  useEffect(() => {
    if (!!liveCollections) {
      setFilteredCollections(
        (liveCollections as any[]).filter(elem => {
          const colName = elem.nfts[0].extendedData.collection.name.toLowerCase()
          return (
            colName.includes(text.toLowerCase()) || tagAvailableColName(colName, text.toLowerCase())
          )
        }) as any
      )
    }
  }, [text, searchValue])

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      //onSubmitSearch(event)
    }
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
            onChange={event => {
              setText(event.target.value)
            }}
            onKeyPress={handleKeyPress}
            className='w-[528px]'
            size='lg'
            placeholder='Search by collection name or tags'
          />

          <Button onClick={null} appearance='neutral' size='lg' className='h-[52px] w-[160px]'>
            Search
          </Button>
        </div>
      </div>

      <div className='container pt-[80px]'>
        <ul className='grid grid-cols-4 gap-[32px]'>
          {(filteredCollections || []).map(
            (collection: any) =>
              !!collection && (
                <li key={collection?.collection}>
                  <Link to={`/collection/${collection?.collection ?? collection?.name}`}>
                    <CollectionCard hasButton={false} collection={collection} />
                  </Link>
                </li>
              )
          )}
        </ul>
      </div>
    </div>
  )
}

export default Discover
