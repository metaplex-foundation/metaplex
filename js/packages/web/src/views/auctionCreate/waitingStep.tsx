import { TransactionResponse } from '@solana/web3.js';
import {
  Button,
  Card,
  Row,
  Col,
  Divider,
  Input,
  Spin,
  Space,
  Progress,
  Tooltip,
  Typography,
} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  SendAndConfirmError,
  useConnection,
  useConnectionConfig,
} from '@oyster/common';
import { ClickToCopy } from '../../components/ClickToCopy';

const { Title, Text } = Typography;

const hasMessage = (e: object): e is { message: unknown } => 'message' in e;

const isCustomInstructionErr = (
  e: unknown,
): e is { InstructionError: [number, { Custom: number }] } => {
  if (!(typeof e === 'object' && e && 'InstructionError' in e)) return false;

  const { InstructionError: err } = e as any;

  if (!(err instanceof Array && err.length === 2)) return false;
  const [id, ierr] = err;

  return (
    typeof id === 'number' &&
    typeof ierr === 'object' &&
    ierr &&
    'Custom' in ierr &&
    typeof ierr.Custom === 'number'
  );
};

export const WaitingStep = (props: {
  createAuction: () => Promise<void>;
  percent: number;
  rejection?: SendAndConfirmError | undefined;
}) => {
  const connection = useConnection();
  const { endpoint } = useConnectionConfig();
  const [rejectedTx, setRejectedTx] = useState<TransactionResponse | undefined>(
    undefined,
  );

  useEffect(() => {
    const func = async () => {
      await props.createAuction();
    };
    func();
  }, []);

  useEffect(() => {
    setRejectedTx(undefined);

    if (props.rejection?.txid) {
      connection
        .getTransaction(props.rejection.txid, { commitment: 'confirmed' })
        .catch(e => console.error(e))
        .then(t => setRejectedTx(t ?? undefined));
    }
  }, [props.rejection]);

  let title = 'Listing NFT with Holaplex...';
  let description: ReactNode =
    'This may take several minutes depending current network demand.';
  let status: 'normal' | 'exception' = 'normal';

  if (props.rejection) {
    title = 'Transaction failed';
    status = 'exception';

    const { txid } = props.rejection;
    let descriptionInner: ReactNode;

    switch (props.rejection.type) {
      case 'tx-error': {
        const err = props.rejection.inner;

        if (isCustomInstructionErr(err)) {
          const {
            InstructionError: [ins, { Custom: code }],
          } = err;

          if (rejectedTx) {
            console.log(rejectedTx);
          }

          descriptionInner = (
            <>
              <p>
                Instruction #{ins + 1} failed with code{' '}
                <code>0x{code.toString(16)}</code>
              </p>
            </>
          );
        } else {
          descriptionInner = (
            <>
              <p>An unexpected Solana error occurred:</p>
              <code>{JSON.stringify(err)}</code>
            </>
          );
        }

        break;
      }
      case 'misc-error': {
        const { inner } = props.rejection;

        let msg: string;

        if (typeof inner === 'object' && inner && hasMessage(inner)) {
          const { message } = inner;
          msg = typeof message === 'string' ? message : JSON.stringify(message);
        } else {
          msg = JSON.stringify(inner);
        }

        descriptionInner = (
          <>
            <p>An unexpected error occurred:</p>
            <code>{msg}</code>
          </>
        );

        break;
      }
    }

    // Kind of a hack, but it's not critical that this works correctly
    const isDevnet = /devnet/i.test(endpoint);

    const solscanLink =
      txid &&
      `https://solscan.io/tx/${txid}${isDevnet ? '?cluster=devnet' : ''}`;

    description = (
      <>
        {txid && (
          <a href={solscanLink} target="_blank" rel="noopener noreferrer">
            View failed transaction
          </a>
        )}
        {txid && !rejectedTx && (
          <Row justify="center">
            <Col flex="0 0 auto">
              <Spin indicator={<LoadingOutlined />} />
            </Col>
          </Row>
        )}
        {descriptionInner}
        {solscanLink && (
          <>
            <Divider />
            <Space direction="vertical" size={16}>
              <Text>
                Check that the wallet you are using has sufficient funds and try
                again. If the error occurs again, get help on{' '}
                <a
                  href="https://discord.gg/e463A53qWj"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  our Discord server
                </a>{' '}
                or{' '}
                <a
                  href="https://holaplex-support.zendesk.com/hc/en-us"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  submit a support request
                </a>
                . Please provide the link to the transaction on Solscan when
                making your request:
              </Text>
              <Input.Group
                compact
                style={{
                  display: 'flex',
                  flexFlow: 'row nowrap',
                  alignItems: 'stretch',
                }}
              >
                <Input
                  style={{ flex: '1 0 0' }}
                  defaultValue={solscanLink}
                  readOnly
                  onClick={e => {
                    const input = e.target as HTMLInputElement;
                    input.setSelectionRange(0, input.value.length);
                  }}
                />
                <ClickToCopy
                  copyText={solscanLink}
                  render={(icon, click) => (
                    <Tooltip style={{ flex: '0 0 auto' }} title="Copy">
                      <Button
                        type="text"
                        style={{
                          width: 'auto',
                          height: 'auto',
                          padding: '0 4px',
                          display: 'flex',
                          flexFlow: 'column nowrap',
                          justifyContent: 'center',
                        }}
                        icon={icon}
                        onClick={click}
                      />
                    </Tooltip>
                  )}
                />
              </Input.Group>
            </Space>
          </>
        )}
      </>
    );
  }

  return (
    <Row justify="center">
      <Col xs={22} md={16} lg={12}>
        <Card>
          <Space
            direction="vertical"
            size="large"
            className="metaplex-fullwidth"
          >
            <Row justify="center">
              <Progress
                status={status}
                type="circle"
                width={140}
                percent={props.percent}
              />
            </Row>
            <Card.Meta
              title={<Title level={5}>{title}</Title>}
              description={description}
            />
          </Space>
        </Card>
      </Col>
    </Row>
  );
};
