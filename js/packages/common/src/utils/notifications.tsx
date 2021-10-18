import React from 'react';
import { notification } from 'antd';
// import Link from '../components/Link';

export function notify({
  message = '',
  description = undefined as any,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
}) {
  if (txid) {
    //   <Link
    //     external
    //     to={'https://explorer.solana.com/tx/' + txid}
    //   >
    //     View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
    //   </Link>

    description = <></>;
  }
  // TODO: what
  (notification as any)[type]({
    message: <span>{message}</span>,
    description: <span>{description}</span>,
    placement,
  });
}
