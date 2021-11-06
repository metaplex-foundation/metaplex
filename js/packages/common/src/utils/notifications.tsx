import React from 'react';
import { notification } from 'antd';
import { ArgsProps, NotificationApi } from 'antd/lib/notification';

export function notify({
  type = 'info',
  txid = undefined,
  message = '',
  description = undefined,
  placement = 'bottomLeft',
  ...rest
}: {
  type?: keyof NotificationApi;
  txid?: string;
} & ArgsProps) {
  if (txid) {
    //   <Link
    //     external
    //     to={'https://explorer.solana.com/tx/' + txid}
    //   >
    //     View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
    //   </Link>

    description = <></>;
  }
  notification[type]({
    ...rest,
    message: <span>{message}</span>,
    description: <span>{description}</span>,
    placement,
  });
}
