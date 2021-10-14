import {Row} from "antd";
import React from "react";

export const GatewayDescriptionText:React.FC = () => (<Row className="call-to-action gateway-description-text" style={{ marginBottom: 20 }}>
  <h2>Add permissions to your auction</h2>
  <p>
    Permissions allow you control who is allowed to bid on your NFTs, whether they need to
    go through KYC, Bot-checks, etc.
  </p>
  <p>
    Permission checks are provided by Civic Pass
  </p>
</Row>)
