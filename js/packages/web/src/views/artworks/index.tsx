import { useWallet } from '@solana/wallet-adapter-react'
import React, { useEffect, useState } from 'react'
import { Layout, Row, Col, Tabs, Dropdown, Menu } from 'antd'
import { useMeta } from '../../contexts'
import { CardLoader } from '../../components/MyLoader'
import CN from 'classnames'
import { ArtworkViewState } from './types'
import { useItems } from './hooks/useItems'
import ItemCard from './components/ItemCard'
import { Button, useUserAccounts } from '@oyster/common'
import { DownOutlined } from '@ant-design/icons'
import { isMetadata, isPack } from './utils'

const { TabPane } = Tabs
const { Content } = Layout

export const ArtworksView = () => {
  const { connected } = useWallet()
  const { isLoading, pullAllMetadata, storeIndexer, pullItemsPage, isFetching } = useMeta()
  const { userAccounts } = useUserAccounts()
  const [activeTab, setActiveTab] = useState('offers')
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex)

  const userItems = useItems({ activeKey })

  useEffect(() => {
    if (!isFetching) {
      pullItemsPage(userAccounts)
      pullAllMetadata()
    }
  }, [isFetching])

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned)
    } else {
      setActiveKey(ArtworkViewState.Metaplex)
    }
  }, [connected, setActiveKey])

  const isDataLoading = isLoading || isFetching

  console.log('userItems', userItems)

  const artworkGrid = (
    <div className='artwork-grid'>
      {/* {isDataLoading && [...Array(10)].map((_, idx) => <CardLoader key={idx} />)} */}
      {
        // !isDataLoading &&
        userItems.map(item => {
          const pubkey = isMetadata(item)
            ? item.pubkey
            : isPack(item)
            ? item.provingProcessKey
            : item.edition?.pubkey || item.metadata.pubkey

          // console.log('item', item)

          return <ItemCard item={item} key={pubkey} />
        })
      }
    </div>
  )

  return (
    <div className='discover container'>
      <div className='nft-details-tabs w-full pt-[20px]'>
        <div className='tabs flex flex-col gap-[20px]'>
          <div className='flex items-center gap-[8px] border-b border-slate-200'>
            <Button
              isRounded={false}
              view={activeTab === 'offers' ? 'outline' : 'solid'}
              appearance={activeTab === 'offers' ? 'secondary' : 'ghost'}
              className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
                'border border-transparent': activeTab !== 'offers',
              })}
              onClick={() => setActiveTab('offers')}>
              Current offers
            </Button>
            <Button
              isRounded={false}
              view={activeTab === 'activity' ? 'outline' : 'solid'}
              appearance={activeTab === 'activity' ? 'secondary' : 'ghost'}
              className={CN('mb-[-1px] rounded-b-[0px] hover:border-b-slate-200', {
                'border border-transparent': activeTab !== 'activity',
              })}
              onClick={() => setActiveTab('activity')}>
              Activity
            </Button>
          </div>
          <div className='flex flex-col'>{artworkGrid}</div>
        </div>
      </div>
      {/* <Tabs
            activeKey={activeKey}
            onTabClick={key => setActiveKey(key as ArtworkViewState)}
            tabBarExtraContent={refreshButton}>
            <TabPane tab={<span className='tab-title'>All</span>} key={ArtworkViewState.Metaplex}>
              {artworkGrid}
            </TabPane>
            {connected && (
              <TabPane tab={<span className='tab-title'>Owned</span>} key={ArtworkViewState.Owned}>
                {artworkGrid}
              </TabPane>
            )}
            {connected && (
              <TabPane
                tab={<span className='tab-title'>Created</span>}
                key={ArtworkViewState.Created}>
                {artworkGrid}
              </TabPane>
            )}
          </Tabs> */}
    </div>
  )
}
