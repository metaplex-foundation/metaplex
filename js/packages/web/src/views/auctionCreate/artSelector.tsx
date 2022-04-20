import React, { useMemo, useState } from 'react'
import { Row, Button, Modal, ButtonProps } from 'antd'
import { useUserArts } from '../../hooks'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import AuctionItemCard from './AuctionItemCard'
import CN from 'classnames'
import { BuyCard } from '@oyster/common'

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
      <div className='grid w-full gap-[16px]'>
        {selected.map(m => {
          const key = m?.metadata.pubkey || ''

          return (
            <>
              {/* <BuyCard key={key} onClick={open} /> */}

              <AuctionItemCard
                key={key}
                current={m}
                onSelect={open}
                onClose={() => {
                  setSelected(selected.filter(_ => _.metadata.pubkey !== key))
                  confirm()
                }}
              />
            </>
          )
        })}
        {(allowMultiple || selectedItems.size === 0) && (
          <div
            className={CN(
              'flex h-[300px] w-[240px] cursor-pointer items-center justify-center rounded border border-slate-200 shadow-card hover:bg-slate-50',
              props.className
            )}
            onClick={open}>
            <div className='flex flex-col items-center justify-center gap-[8px]'>
              <i className='ri-add-circle-fill text-[32px]' />
              <span className='text-center'>Add an NFT</span>
            </div>
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
        <Row className='call-to-action' style={{ marginBottom: 0 }}>
          <h2>Select the NFT you want to sell</h2>
          <p style={{ fontSize: '1.2rem' }}>Select the NFT that you want to sell copy/copies of.</p>
        </Row>
        <Row className='content-action' style={{ overflowY: 'auto', height: '50vh' }}>
          <div className='artwork-grid' style={{ maxHeight: '50%' }}>
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
                <div key={id}>
                  <AuctionItemCard
                    key={id}
                    isSelected={isSelected}
                    current={m}
                    onSelect={onSelect}
                  />
                </div>
              )
            })}
          </div>
        </Row>
        <Row>
          <Button type='primary' size='large' onClick={confirm} className='action-btn'>
            Confirm
          </Button>
        </Row>
      </Modal>
    </>
  )
}
