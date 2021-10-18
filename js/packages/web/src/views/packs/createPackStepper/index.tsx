import React, {useEffect, useState} from 'react';
import { Button, Row, Col, Steps, Typography } from 'antd';
import {useHistory, useParams} from "react-router-dom";

import CreatePack from '../createPack';
import AddVoucher from '../voucher';
import AddCard from '../card';
import useWindowDimensions from "../../../utils/layout";
import {AuctionState} from "../../auctionCreate";

const { Step } = Steps;

interface PackState extends AuctionState {
  vouchersItems: [];
  cardsItems: [];
  vouchersCount: [];
  cardsCount: [];
  actionOnProve: string;
  distribution: string;
}

function CreatePackStepper() {
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [step, setStep] = useState<number>(0);
  const { width } = useWindowDimensions();
  const history = useHistory();
  const { step_param }: { step_param: string } = useParams();

  const [attributes, setAttributes] = useState<PackState>({
    category: 3,
    reservationPrice: 0,
    items: [],
    cardsItems: [],
    vouchersItems: [],
    vouchersCount: [],
    cardsCount: [],
    auctionDurationType: 'minutes',
    gapTimeType: 'minutes',
    winnersCount: 1,
    actionOnProve: 'Burn',
    distribution: 'fixed',
  });

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoNextStep(0);
  }, [step_param]);

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step;
    history.push(`/admin/pack/create/${nextStep.toString()}`);
  };

  const renderBackButton = () => (
    <div style={{ margin: 'auto', width: 'fit-content' }}>
      <Button
        onClick={() => gotoNextStep(step - 1)}
        style={{ height: 50 }}
      >
        Back
      </Button>
    </div>
  );

  const createPackStep = (
    <CreatePack
      confirm={gotoNextStep}
    />
  );

  const addVoucherStep = (
    <AddVoucher
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={gotoNextStep}
      backButton={renderBackButton()}
    />
  );

  const addCardStep = (
    <AddCard
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={gotoNextStep}
      backButton={renderBackButton()}
      distribution={attributes.distribution}
    />
  );

  const steps = [
    ['Create Pack', createPackStep],
    ['Add Voucher', addVoucherStep],
    ['Add Card', addCardStep],
  ]

  return (
    <>
      <Row style={{ marginBottom: 30 }}>
        <Col span={8}>
          <Typography.Title
            level={3}
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
            }}
          >
            Create Pack
          </Typography.Title>
        </Col>

        <Col span={4} offset={12} style={{ display: "flex", justifyContent: "end" }}>
          <Button
            onClick={() => history.push(`/admin/packs`)}
          >
            List of Packs
          </Button>
        </Col>
      </Row>

      <Row style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
            >
              {steps
                .filter(step => !!step[0])
                .map((step, idx) => (
                  <Step title={step[0]} key={idx} />
                ))}
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          {steps[step][1]}
        </Col>
      </Row>
    </>
  );
}

export default CreatePackStepper;
