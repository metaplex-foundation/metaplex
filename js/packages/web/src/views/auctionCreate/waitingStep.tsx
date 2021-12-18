import { TransactionResponse } from '@solana/web3.js';
import {
  Button,
  Card,
  Row,
  Col,
  Divider,
  Spin,
  Space,
  Progress,
  Typography,
} from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  SendAndConfirmError,
  useConnection,
} from '../../../../common/dist/lib';

const { Title } = Typography;

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

  let title = 'Listing NFT with Metaplex...';
  let description: ReactNode =
    'This may take several minutes depending current network demand.';
  let status: 'normal' | 'exception' = 'normal';

  if (props.rejection) {
    title = 'Issue Listing with Metaplex!';
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
              <pre>{JSON.stringify(err)}</pre>
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
            An unexpected error occurred:
            <pre>{msg}</pre>
          </>
        );

        break;
      }
    }

    const solscanLink = txid && `https://solscan.io/tx/${txid}`;

    description = (
      <>
        <h3>Transaction failed</h3>
        {txid && (
          <p>
            Signature:{' '}
            <code style={{ overflowWrap: 'break-word' }}>{txid}</code>
          </p>
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
            <p>
              Solscan link:
              <br />
              <a
                href={solscanLink}
                style={{
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  display: 'inline-block',
                  overflow: 'hidden',
                }}
              >
                {solscanLink}
              </a>
              <br />
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  navigator.clipboard.writeText(solscanLink);
                }}
              >
                Copy Solscan link
              </Button>
            </p>
          </>
        )}
        {rejectedTx?.meta?.logMessages && (
          <>
            <p>Transaction log:</p>
            {rejectedTx.meta.logMessages.map((m, i) => (
              <div key={i}>
                {i > 0 && <Divider />}
                <code style={{ whiteSpace: 'pre-wrap' }}>{m}</code>
              </div>
            ))}
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
