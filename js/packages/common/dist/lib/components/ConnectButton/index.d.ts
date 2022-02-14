import React from 'react';
import { ButtonProps } from 'antd/lib/button';
export interface ConnectButtonProps extends ButtonProps, React.RefAttributes<HTMLElement> {
    allowWalletChange?: boolean;
    className?: string;
}
export declare const ConnectButton: (props: ConnectButtonProps) => JSX.Element;
//# sourceMappingURL=index.d.ts.map