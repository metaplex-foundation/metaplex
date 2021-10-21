import { ButtonGroup, ButtonGroupProps } from "@mui/material";
import { Settings } from "./Settings";

export type ConnectButtonProps = ButtonGroupProps & {
  isConnected: boolean;
  onClickConnect: () => void;
  onClickChange: () => void;
};

export const ConnectButton: React.FC<ConnectButtonProps> = ({
  isConnected,
  onClickConnect,
  onClickChange,
  ...restProps
}) => {
  return (
    <ButtonGroup   {...restProps}>
      <Settings/>
    </ButtonGroup>
  );
};

export default ConnectButton;
