import {Button, Select} from "antd";
import {gatekeeperNetworks, GatekeeperNetworkSelection} from "../../contexts/gatekeeperNetwork";
import React from "react";

export const getGatekeeperNetworkByKey = (selectedKey):GatekeeperNetworkSelection|undefined => {
  if (selectedKey === '') return undefined;
  const foundGatekeeperNetwork = gatekeeperNetworks.find(({publicKey}) => publicKey.toBase58() === selectedKey);
  if (foundGatekeeperNetwork) return foundGatekeeperNetwork;
};

type Props = {
  setGatekeeperNetwork: (gatekeeperNetworkSelection?: GatekeeperNetworkSelection) => void
};
export const GatewayRulesetSelector:React.FC<Props> = ({ setGatekeeperNetwork }) => {
  const selectGatekeeperNetworkByKey = (selectedKey) => setGatekeeperNetwork(getGatekeeperNetworkByKey(selectedKey));

  return (
    <Select className='ruleset-selector' onSelect={selectGatekeeperNetworkByKey}>
      <Select.Option key='none' value={''}>
        <div>
          <Button className="app-btn">None</Button>
        </div>
      </Select.Option>
      {gatekeeperNetworks.map(gkn => (
        <Select.Option key={gkn.publicKey.toBase58()} value={gkn.publicKey.toBase58()}>
          <div>
            <Button className="app-btn">{gkn.name}</Button>
            <span>{gkn.description}</span>
          </div>
        </Select.Option>
      ))
      }
    </Select>
  );
};
