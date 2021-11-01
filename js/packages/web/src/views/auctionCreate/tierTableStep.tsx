import { PlusCircleOutlined } from '@ant-design/icons';
import { Creator, MetadataKey, WinningConfigType } from '@oyster/common';
import { Button, Card, Checkbox, Input, Select, Space } from 'antd';
import React from 'react';
import { Tier, TieredAuctionState } from '.';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from './artSelector';

const { Option } = Select;

export const TierTableStep = (props: {
  attributes: TieredAuctionState;
  setAttributes: (attr: TieredAuctionState) => void;
  maxWinners: number;
  confirm: () => void;
}) => {
  const newImmutableTiers = (tiers: Tier[]) => {
    return tiers.map(wc => ({
      items: [...wc.items.map(it => ({ ...it }))],
      winningSpots: [...wc.winningSpots],
    }));
  };
  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);
  const options: { label: string; value: number }[] = [];
  for (let i = 0; i < props.maxWinners; i++) {
    options.push({ label: `Winner ${i + 1}`, value: i });
  }
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Add Winning Tiers and Their Prizes</h2>
        <p>
          Each row represents a tier. You can choose which winning spots get
          which tiers.
        </p>
      </div>
      {props.attributes.tiers.map((wcg, configIndex) => (
        <Space key={configIndex} direction="horizontal" align="center">
          <h3>Tier #{configIndex + 1} Basket</h3>

          <Checkbox.Group
            options={options}
            onChange={value => {
              const newTiers = newImmutableTiers(props.attributes.tiers);
              const myNewTier = newTiers[configIndex];
              myNewTier.winningSpots = value.map(i => Number(i.valueOf()));

              props.setAttributes({
                ...props.attributes,
                tiers: newTiers,
              });
            }}
          />

          {wcg.items.map((i, itemIndex) => (
            <Card key={itemIndex}>
              <Space direction="vertical">
                <ArtSelector
                  className="metaplex-fullwidth"
                  filter={artistFilter}
                  selected={
                    i.safetyDepositBoxIndex !== undefined
                      ? [props.attributes.items[i.safetyDepositBoxIndex]]
                      : []
                  }
                  setSelected={items => {
                    const newItems = [
                      ...props.attributes.items.map(it => ({ ...it })),
                    ];

                    const newTiers = newImmutableTiers(props.attributes.tiers);
                    if (items[0]) {
                      const existing = props.attributes.items.find(
                        it => it.metadata.pubkey === items[0].metadata.pubkey,
                      );
                      if (!existing) newItems.push(items[0]);
                      const index = newItems.findIndex(
                        it => it.metadata.pubkey === items[0].metadata.pubkey,
                      );

                      const myNewTier = newTiers[configIndex].items[itemIndex];
                      myNewTier.safetyDepositBoxIndex = index;
                      if (
                        items[0].masterEdition &&
                        items[0].masterEdition.info.key ==
                          MetadataKey.MasterEditionV1
                      ) {
                        myNewTier.winningConfigType =
                          WinningConfigType.PrintingV1;
                      } else if (
                        items[0].masterEdition &&
                        items[0].masterEdition.info.key ==
                          MetadataKey.MasterEditionV2
                      ) {
                        myNewTier.winningConfigType =
                          WinningConfigType.PrintingV2;
                      } else {
                        myNewTier.winningConfigType =
                          WinningConfigType.TokenOnlyTransfer;
                      }
                      myNewTier.amount = 1;
                    } else if (i.safetyDepositBoxIndex !== undefined) {
                      const myNewTier = newTiers[configIndex];
                      myNewTier.items.splice(itemIndex, 1);
                      if (myNewTier.items.length === 0)
                        newTiers.splice(configIndex, 1);
                      const othersWithSameItem = newTiers.find(c =>
                        c.items.find(
                          it =>
                            it.safetyDepositBoxIndex ===
                            i.safetyDepositBoxIndex,
                        ),
                      );

                      if (!othersWithSameItem) {
                        for (
                          let j = i.safetyDepositBoxIndex + 1;
                          j < props.attributes.items.length;
                          j++
                        ) {
                          newTiers.forEach(c =>
                            c.items.forEach(it => {
                              if (it.safetyDepositBoxIndex === j)
                                it.safetyDepositBoxIndex--;
                            }),
                          );
                        }
                        newItems.splice(i.safetyDepositBoxIndex, 1);
                      }
                    }

                    props.setAttributes({
                      ...props.attributes,
                      items: newItems,
                      tiers: newTiers,
                    });
                  }}
                  allowMultiple={false}
                >
                  Select item
                </ArtSelector>

                {i.winningConfigType !== undefined && (
                  <>
                    <Select
                      defaultValue={i.winningConfigType}
                      onChange={value => {
                        const newTiers = newImmutableTiers(
                          props.attributes.tiers,
                        );

                        const myNewTier =
                          newTiers[configIndex].items[itemIndex];

                        // Legacy hack...
                        if (
                          value == WinningConfigType.PrintingV2 &&
                          myNewTier.safetyDepositBoxIndex &&
                          props.attributes.items[
                            myNewTier.safetyDepositBoxIndex
                          ].masterEdition?.info.key ==
                            MetadataKey.MasterEditionV1
                        ) {
                          value = WinningConfigType.PrintingV1;
                        }
                        myNewTier.winningConfigType = value;
                        props.setAttributes({
                          ...props.attributes,
                          tiers: newTiers,
                        });
                      }}
                    >
                      <Option value={WinningConfigType.FullRightsTransfer}>
                        Full Rights Transfer
                      </Option>
                      <Option value={WinningConfigType.TokenOnlyTransfer}>
                        Token Only Transfer
                      </Option>
                      <Option value={WinningConfigType.PrintingV2}>
                        Printing V2
                      </Option>

                      <Option value={WinningConfigType.PrintingV1}>
                        Printing V1
                      </Option>
                    </Select>

                    {(i.winningConfigType === WinningConfigType.PrintingV1 ||
                      i.winningConfigType === WinningConfigType.PrintingV2) && (
                      <label>
                        <span>
                          How many copies do you want to create for each winner?
                          If you put 2, then each winner will get 2 copies.
                        </span>
                        <span>
                          Each copy will be given unique edition number e.g. 1
                          of 30
                        </span>
                        <Input
                          autoFocus
                          placeholder="Enter number of copies sold"
                          allowClear
                          onChange={info => {
                            const newTiers = newImmutableTiers(
                              props.attributes.tiers,
                            );

                            const myNewTier =
                              newTiers[configIndex].items[itemIndex];
                            myNewTier.amount = parseInt(info.target.value);
                            props.setAttributes({
                              ...props.attributes,
                              tiers: newTiers,
                            });
                          }}
                        />
                      </label>
                    )}
                  </>
                )}
              </Space>
            </Card>
          ))}

          <Button
            type="primary"
            size="large"
            onClick={() => {
              const newTiers = newImmutableTiers(props.attributes.tiers);
              const myNewTier = newTiers[configIndex];
              myNewTier.items.push({});
              props.setAttributes({
                ...props.attributes,
                tiers: newTiers,
              });
            }}
          >
            <PlusCircleOutlined />
          </Button>
        </Space>
      ))}

      <Button
        type="primary"
        size="large"
        onClick={() => {
          const newTiers = newImmutableTiers(props.attributes.tiers);
          newTiers.push({ items: [], winningSpots: [] });
          props.setAttributes({
            ...props.attributes,
            tiers: newTiers,
          });
        }}
      >
        <PlusCircleOutlined />
      </Button>

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={props.confirm}
      >
        Continue to Review
      </Button>
    </Space>
  );
};
