import React, { useMemo, useState } from 'react'
import { Row, Modal, ButtonProps } from 'antd'
import { useUserArts } from '../../hooks'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import AuctionItemCard from './AuctionItemCard'

import { Button } from '@oyster/common'

export interface ArtSelectorProps extends ButtonProps {
  selected: SafetyDepositDraft[]
  setSelected: (selected: SafetyDepositDraft[]) => void
  allowMultiple: boolean
  filter?: (i: SafetyDepositDraft) => boolean
}

export const ArtSelector = (props: ArtSelectorProps) => {
  const { selected, setSelected, allowMultiple } = props
  let items = useUserArts()
  if (props.filter) items = items.filter(props.filter)
  const selectedItems = useMemo<Set<string>>(
    () => new Set(selected.map(item => item.metadata.pubkey)),
    [selected]
  )

  const [visible, setVisible] = useState(false)

  const open = () => {
    clear()

    setVisible(true)
  }

  const close = () => {
    setVisible(false)
  }

  const clear = () => {
    setSelected([])
  }

  const confirm = () => {
    close()
  }

  return (
    <>
      <div className='artwork-grid'>
        {selected.map(m => {
          const key = m?.metadata.pubkey || ''
          return (
            <AuctionItemCard
              key={key}
              current={m}
              onSelect={open}
              onClose={() => {
                setSelected(selected.filter(_ => _.metadata.pubkey !== key))
                confirm()
              }}
            />
          )
        })}

        {(allowMultiple || selectedItems.size === 0) && (
          <div
            className='flex h-[240px] w-[200px] cursor-pointer items-center justify-center rounded border border-gray-200 bg-gray-50 font-600 uppercase hover:bg-gray-100'
            onClick={open}>
            <span className='text-center'>Add an NFT</span>
          </div>
        )}
      </div>

      <Modal
        visible={visible}
        onCancel={close}
        onOk={confirm}
        width={1100}
        footer={null}
        className={'modalp-40 big-modal'}>
        <Row
          className='call-to-action flex flex-col gap-[12px] text-white'
          style={{ marginBottom: 0 }}>
          <h2 className='text-h5 text-white'>Select the NFT you want to sell</h2>
          <p>Select the NFT that you want to sell copy/copies of.</p>
        </Row>
        <Row className='content-action' style={{ overflowY: 'auto', height: '50vh' }}>
          <div className='artwork-grid'>
            {items.map(m => {
              const id = m.metadata.pubkey
              const isSelected = selectedItems.has(id)

              const onSelect = () => {
                let list = [...selectedItems.keys()]
                if (allowMultiple) {
                  list = []
                }

                const newSet = isSelected
                  ? new Set(list.filter(item => item !== id))
                  : new Set([...list, id])

                const selected = items.filter(item => newSet.has(item.metadata.pubkey))
                setSelected(selected)

                if (!allowMultiple) {
                  confirm()
                }
              }

              return (
                <AuctionItemCard key={id} isSelected={isSelected} current={m} onSelect={onSelect} />
              )
            })}
          </div>
        </Row>
        <Row>
          <Button type='primary' size='lg' onClick={confirm} className='w-full uppercase'>
            Confirm
          </Button>
        </Row>
      </Modal>
    </>
  )
}
