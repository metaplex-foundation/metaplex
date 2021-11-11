import { shortenAddress } from '@oyster/common';
import { Select, Spin } from 'antd';
import { SelectProps, SelectValue } from 'antd/es/select';
import debounce from 'lodash/debounce';
import React, { useMemo, useRef, useState } from 'react';
import { useMeta } from '../../contexts';

type SelectOptionsType = SelectProps<unknown>['options'];

export interface DebounceSelectProps<ValueType = unknown>
  extends Omit<SelectProps<ValueType>, 'options' | 'children'> {
  fetchOptions: (search: string) => Promise<SelectOptionsType>;
  debounceTimeout?: number;
}

function DebounceSelect<ValueType extends SelectValue = SelectValue>({
  fetchOptions,
  debounceTimeout = 800,
  ...props
}: DebounceSelectProps<ValueType>) {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState<SelectOptionsType>([]);
  const fetchRef = useRef(0);

  const debounceFetcher = useMemo(() => {
    const loadOptions = (value: string) => {
      fetchRef.current += 1;
      const fetchId = fetchRef.current;
      setOptions([]);
      setFetching(true);

      fetchOptions(value).then(newOptions => {
        if (fetchId !== fetchRef.current) {
          // for fetch callback order
          return;
        }

        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [fetchOptions, debounceTimeout]);

  return (
    <Select<ValueType>
      labelInValue
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      {...props}
      options={options}
    />
  );
}

// Usage of DebounceSelect
export interface UserValue {
  key: string;
  label: string;
  value: string;
}

export const UserSearch = (props: {
  className?: string;
  setCreators: (users: UserValue[]) => void;
}) => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const [value, setValue] = React.useState<UserValue[]>([]);

  return (
    <DebounceSelect<UserValue[]>
      className={props.className}
      mode="multiple"
      size="large"
      value={value}
      placeholder="Select creator"
      fetchOptions={async () => {
        const items = Object.values(whitelistedCreatorsByCreator)
          .filter(c => c.info.activated)
          .map(a => ({
            label: a.info.name || shortenAddress(a.info.address),
            value: a.info.address,
          }));

        return items;
      }}
      onChange={newValue => {
        props.setCreators(newValue);
        setValue(newValue);
      }}
    />
  );
};
