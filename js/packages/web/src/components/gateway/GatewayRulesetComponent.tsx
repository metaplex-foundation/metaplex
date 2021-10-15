import {GatewayRulesetSelector} from "./GatewayRulesetSelector";
import {Row} from "antd";
import React from "react";
import {GatekeeperNetworkSelection} from "../../contexts/gatekeeperNetwork";

type Props = {
  setGatekeeperNetwork: (gatekeeperNetworkSelection?: GatekeeperNetworkSelection) => void
};
export const GatewayRulesetComponent:React.FC<Props> = ({ setGatekeeperNetwork }) =>
  (<Row className="content-action gateway-ruleset-component" style={{ marginBottom: 20 }}>
    <label className="action-field">
      <span className="field-title">Ruleset</span>
      <GatewayRulesetSelector setGatekeeperNetwork={setGatekeeperNetwork}/>
      <p>
        The choice of ruleset determines what steps bidders need to take to
        be permitted to bid on your auction. For more details on the options, see <a href='#'>here</a>.
      </p>
    </label>
  </Row>)
