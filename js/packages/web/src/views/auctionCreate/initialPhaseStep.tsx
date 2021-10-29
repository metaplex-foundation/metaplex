import { Button, Col, Row, Radio } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { AuctionState } from '.';
import { DateTimePicker } from '../../components/DateTimePicker';

export const InitialPhaseStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const [startNow, setStartNow] = useState<boolean>(true);
  const [listNow, setListNow] = useState<boolean>(true);

  const [saleMoment, setSaleMoment] = useState<moment.Moment | undefined>(
    props.attributes.startSaleTS
      ? moment.unix(props.attributes.startSaleTS)
      : undefined,
  );
  const [listMoment, setListMoment] = useState<moment.Moment | undefined>(
    props.attributes.startListTS
      ? moment.unix(props.attributes.startListTS)
      : undefined,
  );

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startSaleTS: saleMoment && saleMoment.unix(),
    });
  }, [saleMoment]);

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startListTS: listMoment && listMoment.unix(),
    });
  }, [listMoment]);

  useEffect(() => {
    if (startNow) {
      setSaleMoment(undefined);
      setListNow(true);
    } else {
      setSaleMoment(moment());
    }
  }, [startNow]);

  useEffect(() => {
    if (listNow) setListMoment(undefined);
    else setListMoment(moment());
  }, [listNow]);

  return (
    <>
      <Row>
        <h2>Initial Phase</h2>
        <p>Set the terms for your auction.</p>
      </Row>
      <Row>
        <Col xl={24}>
          <label>
            <span>When do you want the auction to begin?</span>
            <Radio.Group
              defaultValue="now"
              onChange={info => setStartNow(info.target.value === 'now')}
            >
              <Radio value="now">Immediately</Radio>
              <div>
                Participants can buy the NFT as soon as you finish setting up
                the auction.
              </div>
              <Radio value="later">At a specified date</Radio>
              <div>
                Participants can start buying the NFT at a specified date.
              </div>
            </Radio.Group>
          </label>

          {!startNow && (
            <>
              <label>
                <span>Auction Start Date</span>
                {saleMoment && (
                  <DateTimePicker
                    momentObj={saleMoment}
                    setMomentObj={setSaleMoment}
                    datePickerProps={{
                      disabledDate: (current: moment.Moment) =>
                        current && current < moment().endOf('day'),
                    }}
                  />
                )}
              </label>

              <label>
                <span>When do you want the listing to go live?</span>
                <Radio.Group
                  defaultValue="now"
                  onChange={info => setListNow(info.target.value === 'now')}
                >
                  <Radio value="now" defaultChecked={true}>
                    Immediately
                  </Radio>
                  <div>
                    Participants will be able to view the listing with a
                    countdown to the start date as soon as you finish setting up
                    the sale.
                  </div>
                  <Radio value="later">At a specified date</Radio>
                  <div>
                    Participants will be able to view the listing with a
                    countdown to the start date at the specified date.
                  </div>
                </Radio.Group>
              </label>

              {!listNow && (
                <label>
                  <span>Preview Start Date</span>
                  {listMoment && (
                    <DateTimePicker
                      momentObj={listMoment}
                      setMomentObj={setListMoment}
                      datePickerProps={{
                        disabledDate: (current: moment.Moment) =>
                          current &&
                          saleMoment &&
                          (current < moment().endOf('day') ||
                            current > saleMoment),
                      }}
                    />
                  )}
                </label>
              )}
            </>
          )}
        </Col>
      </Row>
      <Row>
        <Button type="primary" size="large" onClick={props.confirm}>
          Continue
        </Button>
      </Row>
    </>
  );
};
