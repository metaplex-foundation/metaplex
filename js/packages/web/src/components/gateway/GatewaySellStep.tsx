import React from "react";
import {Button, Row, Select} from "antd";
import {gatekeeperNetworks, GatekeeperNetworkSelection} from "../../contexts/gatekeeperNetwork";
import {AuctionState} from "../../views/auctionCreate";
import {omit} from "lodash";

export const GatewaySellStep:React.FC<{
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}> = ({
        attributes,
        setAttributes,
        confirm,
      }) => {

  const selectGatekeeperNetwork = (gkn?:GatekeeperNetworkSelection) => {
    if (!gkn) {
      // remove the gatekeeper network from the auction properties
      setAttributes(omit(attributes, 'gatekeeperNetwork'))
    } else {
      // set the selectedgatekeeper network on the auction properties
      setAttributes({
        ...attributes,
        gatekeeperNetwork: gkn
      })
    }
  };

  const selectGatekeeperNetworkByKey = (selectedKey) => {
    if (selectedKey === '') selectGatekeeperNetwork(undefined)
    const foundGatekeeperNetwork = gatekeeperNetworks.find(({publicKey}) => publicKey.toBase58() === selectedKey);
    if (foundGatekeeperNetwork) selectGatekeeperNetwork(foundGatekeeperNetwork)
  };

  const rulesets = (
    <Select className='rulesetSelector' onSelect={selectGatekeeperNetworkByKey}>
      <Select.Option key='none' value={''} >
        <div>
          <Button className="app-btn">None</Button>
        </div>
      </Select.Option>
      {gatekeeperNetworks.map(gkn => (
        <Select.Option key={gkn.publicKey.toBase58()} value={gkn.publicKey.toBase58()} >
          <div>
            <Button className="app-btn">{gkn.name}</Button>
            <span>{gkn.description}</span>
          </div>
        </Select.Option>
      ))
      }
    </Select>
  );

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 20 }}>
        <h2>Add permissions to your auction</h2>
        <p>
          Permissions allow you control who is allowed to bid on your NFTs, whether they need to
          go through KYC, Bot-checks, etc.
        </p>
        <p>
          Permission checks are provided by Civic Pass
        </p>
      </Row>
      <Row className="content-action" style={{ marginBottom: 20 }}>
        <label className="action-field">
          <span className="field-title">Ruleset</span>
          {rulesets}
          <p>
            The choice of ruleset determines what steps bidders need to take to
            be permitted to bid on your auction. For more details on the options, see <a href='#'>here</a>.
          </p>
        </label>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            confirm();
          }}
          className="action-btn"
        >
          Continue to review
        </Button>
      </Row>
    </>
  );
};
