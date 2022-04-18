import { useWallet } from '@solana/wallet-adapter-react'
import React, { useEffect, useState } from 'react'
import { Layout, Row, Col, Tabs, Dropdown, Menu } from 'antd'
import { useMeta } from '../../contexts'
import { CardLoader } from '../../components/MyLoader'

import { ArtworkViewState } from './types'
import { useItems } from './hooks/useItems'
import ItemCard from './components/ItemCard'
import { useUserAccounts } from '@oyster/common'
import { DownOutlined } from '@ant-design/icons'
import { isMetadata, isPack } from './utils'

const { TabPane } = Tabs
const { Content } = Layout

export const ArtworksView = () => {
  const { connected, publicKey } = useWallet()
  const { isLoading, pullAllMetadata, storeIndexer, pullItemsPage, isFetching } = useMeta()
  const { userAccounts } = useUserAccounts()

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

          return <ItemCard item={item} key={pubkey} />
        })
      }
    </div>
  )

  return (
    <div className='discover container'>
      <Col style={{ width: '100%', marginTop: 10 }}>
        <Row>
          <Tabs
            activeKey={activeKey}
            onTabClick={key => setActiveKey(key as ArtworkViewState)}
            // tabBarExtraContent={refreshButton}
          >
            {/* <TabPane tab={<span className=''>All</span>} key={ArtworkViewState.Metaplex}>
              {artworkGrid}
            </TabPane> */}
            {connected && (
              <TabPane tab={<span className=''>My Items</span>} key={ArtworkViewState.Owned}>
                {artworkGrid}
              </TabPane>
            )}
            {connected && (
              <TabPane tab={<span className=''>Created</span>} key={ArtworkViewState.Created}>
                {artworkGrid}
              </TabPane>
            )}
          </Tabs>
        </Row>
      </Col>
    </div>
  )
}
