import {
  CheckCircleTwoTone,
  LoadingOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import Bugsnag from '@bugsnag/js';
import {
  findProgramAddress,
  programIds,
  StringPublicKey,
  toPublicKey,
  useConnection,
  WalletSigner,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { Badge, Button, ButtonProps, List, Popover } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { closePersonalEscrow } from '../../actions/closePersonalEscrow';
import { sendSignMetadata } from '../../actions/sendSignMetadata';
import { QUOTE_MINT } from '../../constants';
import { useMeta } from '../../contexts';
import BellSvg from '../svgs/bell';

interface NotificationCard {
  id: string;
  title: string;
  description: string | JSX.Element;
  action?: () => Promise<boolean>;
  dismiss?: () => Promise<boolean>;
}

enum RunActionState {
  NotRunning,
  Running,
  Success,
  Failed,
}

function RunAction({
  id,
  action,
  onFinish,
  icon,
}: {
  id: string;
  action: () => Promise<boolean>;
  onFinish?: () => void;
  icon: JSX.Element;
}) {
  const [state, setRunState] = useState<RunActionState>(
    RunActionState.NotRunning,
  );

  useMemo(() => setRunState(RunActionState.NotRunning), [id]);

  const run = async () => {
    await setRunState(RunActionState.Running);
    const result = await action();
    if (result) {
      await setRunState(RunActionState.Success);
      setTimeout(() => (onFinish ? onFinish() : null), 2000); // Give user a sense of completion before removal from list
    } else {
      await setRunState(RunActionState.Failed);
    }
  };

  let component;
  switch (state) {
    case RunActionState.NotRunning:
      component = <span onClick={run}>{icon}</span>;
      break;
    case RunActionState.Failed:
      component = (
        <span onClick={run}>
          <SyncOutlined />
        </span>
      );
      break;
    case RunActionState.Running:
      component = <LoadingOutlined />;
      break;
    case RunActionState.Success:
      component = <CheckCircleTwoTone twoToneColor="#52c41a" />;
  }

  return component;
}

export async function getPersonalEscrowAta(
  wallet: WalletSigner | undefined,
): Promise<StringPublicKey | undefined> {
  const PROGRAM_IDS = programIds();
  if (!wallet?.publicKey) return;

  return (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        PROGRAM_IDS.token.toBuffer(),
        QUOTE_MINT.toBuffer(),
      ],
      PROGRAM_IDS.associatedToken,
    )
  )[0];
}

export function useCollapseWrappedSol({
  connection,
  wallet,
  notifications,
}: {
  connection: Connection;
  wallet: WalletSigner;
  notifications: NotificationCard[];
}) {
  const [showNotification, setShowNotification] = useState(false);
  const fn = async () => {
    const ata = await getPersonalEscrowAta(wallet);
    if (ata) {
      try {
        const balance = await connection.getTokenAccountBalance(
          toPublicKey(ata),
        );

        if ((balance && balance.value.uiAmount) || 0 > 0) {
          setShowNotification(true);
        }
      } catch (e) {
        // console.error(e);
        // Bugsnag.notify(e); // this overloads bugsnag a bit
      }
    }
    setTimeout(fn, 60000);
  };
  useEffect(() => {
    fn();
  }, []);

  if (showNotification) {
    notifications.push({
      id: 'unsettled',
      title: 'Unsettled funds!',
      description:
        'You have unsettled royalties in your personal escrow account.',
      action: async () => {
        try {
          const ata = await getPersonalEscrowAta(wallet);
          if (ata) {
            const data = await connection.getAccountInfo(toPublicKey(ata));
            if (data?.data.length || 0 > 0)
              await closePersonalEscrow(connection, wallet, ata);
          }
        } catch (e) {
          console.error(e);
          return false;
        }
        return true;
      },
    });
  }
}

export function Notifications({
  buttonType,
}: {
  buttonType?: ButtonProps['type'];
}) {
  const { metadata, whitelistedCreatorsByCreator, store } = useMeta();

  const connection = useConnection();
  const wallet = useWallet();
  const notifications: NotificationCard[] = [];

  const walletPubkey = wallet.publicKey?.toBase58() || '';

  useCollapseWrappedSol({ connection, wallet, notifications });

  const metaNeedsApproving = useMemo(
    () =>
      metadata.filter(m => {
        return (
          m.info.data.creators &&
          (whitelistedCreatorsByCreator[m.info.updateAuthority]?.info
            ?.activated ||
            store?.info.public) &&
          m.info.data.creators.find(
            c => c.address === walletPubkey && !c.verified,
          )
        );
      }),
    [metadata, whitelistedCreatorsByCreator, walletPubkey],
  );

  metaNeedsApproving.forEach(m => {
    notifications.push({
      id: m.pubkey,
      title: 'You have a new artwork to approve!',
      description: (
        <span>
          A whitelisted creator wants you to approve a collaboration. See
          artwork <Link to={`/artworks/${m.pubkey}`}>here</Link>.
        </span>
      ),
      action: async () => {
        try {
          await sendSignMetadata(connection, wallet, m.pubkey);
        } catch (e) {
          console.error(e);
          return false;
        }
        return true;
      },
    });
  });

  const activeNotifications =
    notifications.length > 0
      ? notifications.slice(0, 10)
      : ([
          {
            title: 'No Notifications',
            description: 'You have no notifications that need attending.',
          },
        ] as NotificationCard[]);

  const content = (
    <List
      itemLayout="vertical"
      size="small"
      className="metaplex-notifications"
      dataSource={activeNotifications}
      renderItem={(item: NotificationCard) => (
        <List.Item
          extra={
            <>
              {item.action && (
                <RunAction
                  id={item.id}
                  action={item.action}
                  icon={<PlayCircleOutlined />}
                />
              )}
              {item.dismiss && (
                <RunAction
                  id={item.id}
                  action={item.dismiss}
                  icon={<PlayCircleOutlined />}
                />
              )}
            </>
          }
        >
          <List.Item.Meta title={item.title} description={item.description} />
        </List.Item>
      )}
    />
  );

  const justContent = (
    <Popover placement="bottomRight" content={content} trigger="click">
      <Button className="" type={buttonType}>
        <BellSvg />
      </Button>
    </Popover>
  );

  if (notifications.length === 0) return justContent;
  else return <Badge count={notifications.length}>{justContent}</Badge>;
}
