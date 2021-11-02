import { Button, Radio, Space } from 'antd';
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
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Initial Phase</h2>
        <p>Set the terms for your auction.</p>
      </div>

      <label>
        <h4>When do you want the auction to begin?</h4>
        <Radio.Group
          defaultValue="now"
          onChange={info => setStartNow(info.target.value === 'now')}
        >
          <Radio value="now">Immediately</Radio>
          <div>
            Participants can buy the NFT as soon as you finish setting up the
            auction.
          </div>
          <Radio value="later">At a specified date</Radio>
          <div>Participants can start buying the NFT at a specified date.</div>
        </Radio.Group>
      </label>

      {!startNow && (
        <>
          <label>
            <h4>Auction Start Date</h4>
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
            <h4>When do you want the listing to go live?</h4>
            <Radio.Group
              defaultValue="now"
              onChange={info => setListNow(info.target.value === 'now')}
            >
              <Radio value="now" defaultChecked={true}>
                Immediately
              </Radio>
              <div>
                Participants will be able to view the listing with a countdown
                to the start date as soon as you finish setting up the sale.
              </div>
              <Radio value="later">At a specified date</Radio>
              <div>
                Participants will be able to view the listing with a countdown
                to the start date at the specified date.
              </div>
            </Radio.Group>
          </label>

          {!listNow && (
            <label>
              <h4>Preview Start Date</h4>
              {listMoment && (
                <DateTimePicker
                  momentObj={listMoment}
                  setMomentObj={setListMoment}
                  datePickerProps={{
                    disabledDate: (current: moment.Moment) =>
                      current &&
                      saleMoment &&
                      (current < moment().endOf('day') || current > saleMoment),
                  }}
                />
              )}
            </label>
          )}
        </>
      )}

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={props.confirm}
      >
        Continue
      </Button>
    </Space>
  );
};
