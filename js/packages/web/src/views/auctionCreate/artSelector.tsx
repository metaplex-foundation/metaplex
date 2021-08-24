import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Modal, ButtonProps, Typography, Spin } from 'antd';
import { ArtCard } from './../../components/ArtCard';
import { useUserArts } from '../../hooks';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import {  useApes } from '../../contexts';
import { ApeTag } from '../../components/ApeTag/ape-tag';
import { ArtContent } from '../../components/ArtContent';
import useWindowDimensions from '../../utils/layout';

const { Title } = Typography;
export interface ArtSelectorProps extends ButtonProps {
  selected: SafetyDepositDraft[];
  setSelected: (selected: SafetyDepositDraft[]) => void;
  allowMultiple: boolean;
  filter?: (i: SafetyDepositDraft) => boolean;
  setApe: (ape: any) => void;
}

export const ArtSelector = (props: ArtSelectorProps) => {
  const { selected, setSelected, allowMultiple, ...rest } = props;
  let items = useUserArts();
  const { apes, myApes } = useApes();
  const [apeData, setApeData] = useState<any>();
  const [loading, setLoading] = useState(false);
  const {width} = useWindowDimensions()


  if (props.filter) items = items.filter(props.filter);
  const selectedItems = useMemo<Set<string>>(
    () => new Set(selected.map(item => item.metadata.pubkey)),
    [selected],
  );

  const [visible, setVisible] = useState(false);

  const onSelectApeGrid = useCallback((a) => {
    if (!a) {
      props.setApe(undefined);
      setApeData(undefined);
      setSelected([]);
      confirm();
      return
    }
    const s = items.find(item => item.metadata.info.mint.toString() === a.metadata.minted_token_pubkey);
    if (s) {
      props.setApe(a);
      setApeData(a);
      setSelected([s]);
      confirm();
    }
  }, [apeData, apes, items.length])

  const open = () => {
    clear();

    setVisible(true);
  };

  const onSelectArt = useCallback((m) => {
    if (!m) {
      onSelectApeGrid(undefined);
      return
    }
    const selectedMint = m.metadata.info.mint.toString();
    const data = myApes.find(
      ape => ape.metadata.minted_token_pubkey === selectedMint
    );
    onSelectApeGrid(data)
    
  }, [apeData, apes])

  const close = () => {
    setVisible(false);
  };

  const clear = () => {
    setSelected([]);
  };

  const confirm = () => {
    close();
  };



  useEffect(() => {
    if (apes.length && selected && selected.length && !apeData) {
      const selectedMint = selected[0].metadata.info.mint.toString();
      const data = apes.find(
        ape => ape.metadata.minted_token_pubkey === selectedMint
      );
      setLoading(true);
      fetch(data.attributes.image_url).then(res => res.json()).then((res) => {
        setApeData(res);
        setLoading(false);
      })
    };
  }, [apes, apeData, selected, loading])

  const getDisplay = () => {
    if (width <= 768) {
      return 'block'
    }
    return selected?.length ? 'flex' : 'grid'
  }

  return (
    <>
      {apeData && <div style={{ display: getDisplay(), flexDirection: 'row', alignItems: 'center' }}>
        <ArtCard
          preview={false}
          onClick={open}
          hideMeta
          ape={apeData}
          close={() => {
            setSelected(
              selected.filter(_ => _.metadata.pubkey !== selected[0]?.metadata?.pubkey || ''),
            );
            onSelectArt(undefined)
            confirm();
          }}
        />
        <div style={{ padding: '0 1rem', flex: 1 }}>
          {loading && <div style={{ textAlign: 'center' }}><Spin /></div>}
          <Title level={3}>{apeData?.name}</Title>

          <div>
            {apeData?.attributes?.map((attr: any) => <ApeTag key={attr.trait_type} {...attr} />)}
          </div>

          {/* <Title level={3}>Rarity: {getRarityForApe(apeData)}</Title> */}
        </div>
      </div>}
      {apeData && (
        <Title level={4}>Or select a different Ape</Title>
      )}
      <div style={{ display: selected.length ? 'flex' : 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', overflow: 'auto', marginBottom: '2rem' }}>
        {myApes.filter(a => a.name !== apeData?.name).map(a => (<div key={a.name} onClick={() => onSelectApeGrid(a)} style={{ 
          cursor: 'pointer', 
          minWidth: selected.length ? '120px' : '100%',  
          maxWidth: selected.length ? '120px' : '100%',  
        }}  >
          <ArtContent uri={a.image} preview={false} />
          <div>
            <Title level={4}>{a?.name}</Title>
            {/* <span>Rarity: {getRarityForApe(a)}</span> */}
          </div>
        </div>))}
      </div>

      <Modal
        visible={visible}
        onCancel={close}
        onOk={confirm}
        width={1100}
        footer={null}
      >
        <Row className="call-to-action" style={{ marginBottom: 0 }}>
          <h2>Select the Ape you want to sell</h2>
        </Row>
        <Row className="content-action" style={{ overflowY: 'auto', height: "50vh" }}>
          <div style={{
            display: 'grid',
            gap: '0 1rem',
            gridAutoRows: 300,
            gridTemplateColumns: 'repeat(3, 1fr)'
          }}>
            {items.map(m => {
              const id = m.metadata.pubkey;
              const isSelected = selectedItems.has(id);

              return (
                <ArtCard
                  key={id}
                  pubkey={m.metadata.pubkey}
                  preview={false}
                  hideMeta
                  onClick={() => onSelectArt(m)}
                  className={isSelected ? 'selected-card' : 'not-selected-card'}
                />
              );
            })}
          </div>
        </Row>
      </Modal>
    </>
  );
};
