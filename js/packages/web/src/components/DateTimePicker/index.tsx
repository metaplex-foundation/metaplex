import React from 'react'

import { DatePicker, TimePicker } from 'antd'

interface IDateTimePicker {
  momentObj: moment.Moment,
  setMomentObj: Function,
  datePickerProps?: Object,
  timePickerProps?: Object,
}

export const DateTimePicker = (props: IDateTimePicker) => {
  const { momentObj, setMomentObj, datePickerProps = {}, timePickerProps = {} } = props
  return <>
    <DatePicker
      className="field-date"
      size="large"
      value={momentObj}
      onChange={value => {
        if (!value) return;
        if (!momentObj) return setMomentObj(value);

        const currentMoment = momentObj.clone();
        currentMoment.year(value.year());
        currentMoment.month(value.month());
        currentMoment.date(value.date());
        setMomentObj(currentMoment);
      }}
      {...datePickerProps}
    />
    <TimePicker
      className="field-date"
      size="large"
      value={momentObj}
      onChange={value => {
        if (!value) return;
        if (!momentObj) return setMomentObj(value);

        const currentMoment = momentObj.clone();
        currentMoment.hour(value.hour());
        currentMoment.minute(value.minute());
        currentMoment.second(value.second());
        setMomentObj(currentMoment);
      }}
      {...timePickerProps}
    />
  </>
}
