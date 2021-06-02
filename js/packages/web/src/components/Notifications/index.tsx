import {
  CheckCircleTwoTone,
  LoadingOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  useConnection,
  useUserAccounts,
  useWallet,
} from '@oyster/common';
import { Badge, Popover, List } from 'antd';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { closePersonalEscrow } from '../../actions/closePersonalEscrow';
import { sendSignMetadata } from '../../actions/sendSignMetadata';

import { QUOTE_MINT } from '../../constants';
import { useMeta } from '../../contexts';
import './index.less';
interface NotificationCard {
  title: string;
  description: string | JSX.Element;
  action: () => Promise<boolean>;
  dismiss?: () => Promise<boolean>;
}

enum RunActionState {
  NotRunning,
  Running,
  Success,
  Failed,
}

function RunAction({
  action,
  onFinish,
  icon,
}: {
  action: () => Promise<boolean>;
  onFinish?: () => void;
  icon: JSX.Element;
}) {
  const [state, setRunState] = useState<RunActionState>(
    RunActionState.NotRunning,
  );

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
      component = (
        <span className="hover-button" onClick={run}>
          {icon}
        </span>
      );
      break;
    case RunActionState.Failed:
      component = (
        <span className="hover-button" onClick={run}>
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

export function Notifications() {
  const { userAccounts } = useUserAccounts();
  const { metadata, whitelistedCreatorsByCreator, store } = useMeta();
  const connection = useConnection();
  const { wallet } = useWallet();

  const notifications: NotificationCard[] = [];

  const quoteAccts = userAccounts.filter(
    a =>
      a.info.mint.toBase58() === QUOTE_MINT.toBase58() &&
      a.pubkey.toBase58() !== wallet?.publicKey?.toBase58(),
  );
  quoteAccts.forEach(quoteAcct => {
    if (quoteAcct && (quoteAcct?.info.amount.toNumber() || 0) > 0) {
      notifications.push({
        title: 'Unsettled funds!',
        description:
          'You have unsettled royalties in your personal escrow account.',
        action: async () => {
          try {
            await closePersonalEscrow(connection, wallet, quoteAcct.pubkey);
          } catch (e) {
            console.error(e);
            return false;
          }
          return true;
        },
      });
    }
  });

  const walletPubkey = wallet?.publicKey?.toBase58() || '';
  const metaNeedsApproving = useMemo(
    () =>
      metadata.filter(m => {
        return (
          m.info.data.creators &&
          (whitelistedCreatorsByCreator[m.info.updateAuthority.toBase58()]?.info
            ?.activated ||
            store?.info.public) &&
          m.info.data.creators.find(
            c => c.address.toBase58() === walletPubkey && !c.verified,
          )
        );
      }),
    [metadata, whitelistedCreatorsByCreator, walletPubkey],
  );

  metaNeedsApproving.forEach(m => {
    notifications.push({
      title: 'You have a new artwork to approve!',
      description: (
        <span>
          {whitelistedCreatorsByCreator[m.info.updateAuthority.toBase58()]?.info
            ?.name || m.pubkey.toBase58()}{' '}
          wants you to approve that you helped create their art{' '}
          <Link to={`/art/${m.pubkey.toBase58()}`}>here.</Link>
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

  const content = notifications.length ? (
    <div style={{ width: '300px' }}>
      <List
        itemLayout="vertical"
        size="small"
        dataSource={notifications.slice(0, 10)}
        renderItem={(item: NotificationCard) => (
          <List.Item
            extra={
              <>
                <RunAction action={item.action} icon={<PlayCircleOutlined />} />
                {item.dismiss && (
                  <RunAction
                    action={item.dismiss}
                    icon={<PlayCircleOutlined />}
                  />
                )}
              </>
            }
          >
            <List.Item.Meta
              title={<span>{item.title}</span>}
              description={
                <span>
                  <i>{item.description}</i>
                </span>
              }
            />
          </List.Item>
        )}
      />
    </div>
  ) : (
    <span>No notifications</span>
  );

  const justContent = (
    <Popover
      className="noty-popover"
      placement="bottomLeft"
      content={content}
      trigger="click"
    >
      <h1 className="title">M</h1>
    </Popover>
  );

  if (notifications.length === 0) return justContent;
  else
    return (
      <Badge count={notifications.length} style={{ backgroundColor: 'white' }}>
        {justContent}
      </Badge>
    );
}
