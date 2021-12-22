import {
  ENDPOINTS,
  formatNumber,
  formatUSD,
  Identicon,
  MetaplexModal,
  Settings,
  shortenAddress,
  useConnectionConfig,
  useNativeAccount,
  useWalletModal,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Button, ButtonProps, Popover, Select, Space } from 'antd';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useMeta, useSolPrice } from '../../contexts';
import { SolCircle } from '../Custom';
import CogSvg from '../svgs/cog';

const UserActions = (props: { mobile?: boolean; onClick?: () => void }) => {
  const { publicKey } = useWallet();
  const { whitelistedCreatorsByCreator, store } = useMeta();
  const pubkey = publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

  return (
    <>
      {store &&
        (props.mobile ? (
          <div>
            {canCreate && (
              <Link to="/nfts/new/0">
                <Button
                  onClick={() => {
                    props.onClick ? props.onClick() : null;
                  }}
                >
                  Create
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {canCreate && (
              <>
                <Link to="/nfts/new/0">
                  <Button>Create</Button>
                </Link>
                &nbsp;&nbsp;
              </>
            )}
          </div>
        ))}
    </>
  );
};

export const AddFundsModal = (props: {
  showAddFundsModal: boolean;
  setShowAddFundsModal: Dispatch<SetStateAction<boolean>>;
  balance: number;
  publicKey: PublicKey;
}) => {
  return (
    <MetaplexModal
      visible={props.showAddFundsModal}
      onCancel={() => props.setShowAddFundsModal(false)}
      title="Add Funds"
    >
      <div>
        <p>
          We partner with <b>FTX</b> to make it simple to start purchasing
          digital collectibles.
        </p>
        <div>
          <span>Balance</span>
          <span>
            {formatNumber.format(props.balance)}&nbsp;&nbsp;
            <span>
              <img src="/sol.svg" width="10" />
            </span>{' '}
            SOL
          </span>
        </div>
        <p>
          If you have not used FTX Pay before, it may take a few moments to get
          set up.
        </p>
        <Button onClick={() => props.setShowAddFundsModal(false)}>Close</Button>
        <Button
          onClick={() => {
            window.open(
              `https://ftx.com/pay/request?coin=SOL&address=${props.publicKey?.toBase58()}&tag=&wallet=sol&memoIsRequired=false`,
              '_blank',
              'resizable,width=680,height=860',
            );
          }}
        >
          <div>
            <span>Sign with</span>
            <img src="/ftxpay.png" width="80" />
          </div>
        </Button>
      </div>
    </MetaplexModal>
  );
};

export const CurrentUserBadge = (props: {
  buttonType?: ButtonProps['type'];
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
}) => {
  const { wallet, publicKey, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  const [showAddFundsModal, setShowAddFundsModal] = useState<boolean>(false);

  if (!wallet || !publicKey || !solPrice) {
    return null;
  }
  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;

  let name = props.showAddress ? shortenAddress(`${publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name && !props.showAddress) {
    name = unknownWallet.name;
  }

  const image = unknownWallet.image ? (
    <img src={unknownWallet.image} />
  ) : (
    <Identicon address={publicKey?.toBase58()} size={22} />
  );

  return (
    <>
      <Popover
        trigger="click"
        placement="bottomRight"
        content={
          <Settings
            additionalSettings={
              <Space direction="vertical">
                <h5>BALANCE</h5>
                <Space direction="horizontal">
                  <SolCircle />
                  <span>{formatNumber.format(balance)} SOL</span>
                  <span>{formatUSD.format(balanceInUSD)}</span>
                </Space>
                <Space direction="horizontal">
                  <Button onClick={() => setShowAddFundsModal(true)}>
                    Add Funds
                  </Button>
                  <Button onClick={disconnect}>Disconnect</Button>
                </Space>
                <UserActions />
              </Space>
            }
          />
        }
      >
        <Button className="metaplex-button-appbar" type={props.buttonType}>
          <Space direction="horizontal">
            {props.showBalance && (
              <span>
                {formatNumber.format(
                  (account?.lamports || 0) / LAMPORTS_PER_SOL,
                )}{' '}
                SOL
              </span>
            )}
            {image}
            {name && <span>{name}</span>}
          </Space>
        </Button>
      </Popover>
      <AddFundsModal
        setShowAddFundsModal={setShowAddFundsModal}
        showAddFundsModal={showAddFundsModal}
        publicKey={publicKey}
        balance={balance}
      />
    </>
  );
};

export const Cog = ({ buttonType }: { buttonType?: ButtonProps['type'] }) => {
  const { endpoint, setEndpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Space direction="vertical">
          <h5>NETWORK</h5>
          <Select onSelect={setEndpoint} value={endpoint} bordered={false}>
            {ENDPOINTS.map(({ name, endpoint }) => (
              <Select.Option value={endpoint} key={endpoint}>
                {name}
              </Select.Option>
            ))}
          </Select>

          <Button onClick={open}>Change wallet</Button>
        </Space>
      }
    >
      <Button className="metaplex-button-appbar" type={buttonType}>
        <CogSvg />
      </Button>
    </Popover>
  );
};

export const CurrentUserBadgeMobile = (props: {
  showBalance?: boolean;
  showAddress?: boolean;
  iconSize?: number;
  closeModal?: () => void;
}) => {
  const { wallet, publicKey, disconnect } = useWallet();
  const { account } = useNativeAccount();
  const solPrice = useSolPrice();

  const [showAddFundsModal, setShowAddFundsModal] = useState<boolean>(false);

  if (!wallet || !publicKey || !solPrice) {
    return null;
  }
  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL;
  const balanceInUSD = balance * solPrice;

  let name = props.showAddress ? shortenAddress(`${publicKey}`) : '';
  const unknownWallet = wallet as any;
  if (unknownWallet.name && !props.showAddress) {
    name = unknownWallet.name;
  }

  let image = <Identicon address={publicKey?.toBase58()} />;

  if (unknownWallet.image) {
    image = <img src={unknownWallet.image} />;
  }

  return (
    <div>
      <div>
        {image}
        {name && <span>{name}</span>}
      </div>
      <div>
        <span>Balance</span>
        <span>
          <span>
            <img src="/sol.svg" width="10" />
          </span>{' '}
          {formatNumber.format(balance)}&nbsp;&nbsp; SOL{' '}
          <span>{formatUSD.format(balanceInUSD)}</span>
        </span>
      </div>
      <div>
        <Button
          onClick={() => {
            props.closeModal ? props.closeModal() : null;
            setShowAddFundsModal(true);
          }}
        >
          Add Funds
        </Button>
        &nbsp;&nbsp;
        <Button onClick={disconnect}>Disconnect</Button>
      </div>
      <div>
        <UserActions
          mobile
          onClick={() => {
            props.closeModal ? props.closeModal() : null;
          }}
        />
      </div>
      <AddFundsModal
        setShowAddFundsModal={setShowAddFundsModal}
        showAddFundsModal={showAddFundsModal}
        publicKey={publicKey}
        balance={balance}
      />
    </div>
  );
};
