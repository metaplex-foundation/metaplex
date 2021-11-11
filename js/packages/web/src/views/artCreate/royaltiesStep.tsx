import {
  Creator,
  IMetadataExtension,
  MetaplexModal,
  shortenAddress,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Col, InputNumber, Row, Slider, Space, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { UserSearch, UserValue } from '../../components/UserSearch';

const { Text } = Typography;

interface Royalty {
  creatorKey: string;
  amount: number;
}

const RoyaltiesSplitter = (props: {
  creators: Array<UserValue>;
  royalties: Array<Royalty>;
  setRoyalties: Function;
  isShowErrors?: boolean;
}) => {
  return (
    <Col>
      <Row gutter={[0, 24]}>
        {props.creators.map((creator, idx) => {
          const royalty = props.royalties.find(
            royalty => royalty.creatorKey === creator.key,
          );
          if (!royalty) return null;

          const amt = royalty.amount;

          const handleChangeShare = (newAmt: number) => {
            props.setRoyalties(
              props.royalties.map(_royalty => {
                return {
                  ..._royalty,
                  amount:
                    _royalty.creatorKey === royalty.creatorKey
                      ? newAmt
                      : _royalty.amount,
                };
              }),
            );
          };

          return (
            <Col span={24} key={idx}>
              <Row align="middle" gutter={[0, 16]}>
                <Col span={4}>{creator.label}</Col>
                <Col span={3}>
                  <InputNumber<number>
                    min={0}
                    max={100}
                    formatter={value => `${value}%`}
                    value={amt}
                    parser={value => parseInt(value?.replace('%', '') ?? '0')}
                    onChange={handleChangeShare}
                  />
                </Col>
                <Col span={4}>
                  <Slider value={amt} onChange={handleChangeShare} />
                </Col>
                {props.isShowErrors && amt === 0 && (
                  <Col>
                    <Text type="danger">
                      The split percentage for this creator cannot be 0%.
                    </Text>
                  </Col>
                )}
              </Row>
            </Col>
          );
        })}
      </Row>
    </Col>
  );
};

export const RoyaltiesStep = (props: {
  attributes: IMetadataExtension;
  setAttributes: (attr: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  // const file = props.attributes.image;
  const { publicKey, connected } = useWallet();
  const [creators, setCreators] = useState<Array<UserValue>>([]);
  const [fixedCreators, setFixedCreators] = useState<Array<UserValue>>([]);
  const [royalties, setRoyalties] = useState<Array<Royalty>>([]);
  const [totalRoyaltyShares, setTotalRoyaltiesShare] = useState<number>(0);
  const [showCreatorsModal, setShowCreatorsModal] = useState<boolean>(false);
  const [isShowErrors, setIsShowErrors] = useState<boolean>(false);
  const [sellerFeeBasisPoints, setSellerFeeBasisPoints] = useState<number>(1000);

  useEffect(() => {
    if (publicKey) {
      const key = publicKey.toBase58();
      setFixedCreators([
        {
          key,
          label: shortenAddress(key),
          value: key,
        },
      ]);
    }
  }, [connected, setCreators]);

  useEffect(() => {
    setRoyalties(
      [...fixedCreators, ...creators].map(creator => ({
        creatorKey: creator.key,
        amount: Math.trunc(100 / [...fixedCreators, ...creators].length),
      })),
    );
  }, [creators, fixedCreators]);

  useEffect(() => {
    // When royalties changes, sum up all the amounts.
    const total = royalties.reduce((totalShares, royalty) => {
      return totalShares + royalty.amount;
    }, 0);

    setTotalRoyaltiesShare(total);
  }, [royalties]);
  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      seller_fee_basis_points: sellerFeeBasisPoints
    })
  }, [sellerFeeBasisPoints]);

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Set royalties and creator splits</h2>
        <p>
          Royalties ensure that you continue to get compensated for your work
          after its initial sale.
        </p>
      </div>
      <label>
        <h3>Royalty Percentage</h3>
        <p>
          This is how much of each secondary sale will be paid out to the
          creators.
        </p>
        <InputNumber<number>
          autoFocus
          min={0}
          max={100}
          formatter={v => `${v}%`}
          defaultValue={10}
          parser={v => parseInt(v?.replace('%', '') ?? '0')}
          onChange={(val: number) => setSellerFeeBasisPoints(val * 100)}
        />
      </label>
      {[...fixedCreators, ...creators].length > 0 && (
        <div>
          <label>
            <h3>Creators Split</h3>
            <p>
              This is how much of the proceeds from the initial sale and any
              royalties will be split out amongst the creators.
            </p>
            <RoyaltiesSplitter
              creators={[...fixedCreators, ...creators]}
              royalties={royalties}
              setRoyalties={setRoyalties}
              isShowErrors={isShowErrors}
            />
          </label>
        </div>
      )}
      <Row>
        <Button type="text" onClick={() => setShowCreatorsModal(true)}>
          <span>+</span>
          <span>Add another creator</span>
        </Button>
        <MetaplexModal
          visible={showCreatorsModal}
          onCancel={() => setShowCreatorsModal(false)}
        >
          <label>
            <span>Creators</span>
            <UserSearch
              className="metaplex-fullwidth"
              setCreators={setCreators}
            />
          </label>
        </MetaplexModal>
      </Row>
      {isShowErrors && totalRoyaltyShares !== 100 && (
        <Row>
          <Text type="danger">
            The split percentages for each creator must add up to 100%. Current
            total split percentage is {totalRoyaltyShares}%.
          </Text>
        </Row>
      )}
      <Row>
        <Button
          className="metaplex-fullwidth"
          type="primary"
          size="large"
          onClick={() => {
            // Find all royalties that are invalid (0)
            const zeroedRoyalties = royalties.filter(
              royalty => royalty.amount === 0,
            );

            if (zeroedRoyalties.length !== 0 || totalRoyaltyShares !== 100) {
              // Contains a share that is 0 or total shares does not equal 100, show errors.
              setIsShowErrors(true);
              return;
            }

            const creatorStructs: Creator[] = [
              ...fixedCreators,
              ...creators,
            ].map(
              c =>
                new Creator({
                  address: c.value,
                  verified: c.value === publicKey?.toBase58(),
                  share:
                    royalties.find(r => r.creatorKey === c.value)?.amount ||
                    Math.round(100 / royalties.length),
                }),
            );

            const share = creatorStructs.reduce(
              (acc, el) => (acc += el.share),
              0,
            );
            if (share > 100 && creatorStructs.length) {
              creatorStructs[0].share -= share - 100;
            }
            props.setAttributes({
              ...props.attributes,
              creators: creatorStructs,
            });
            props.confirm();
          }}
        >
          Continue to review
        </Button>
      </Row>
    </Space>
  );
};
