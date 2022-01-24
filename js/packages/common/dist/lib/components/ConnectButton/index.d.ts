import { ButtonProps } from 'antd/lib/button';
import React from 'react';
export interface ConnectButtonProps extends ButtonProps, React.RefAttributes<HTMLElement> {
    allowWalletChange?: boolean;
    className?: string;
}
export declare const ConnectButton: (props: ConnectButtonProps) => JSX.Element;
//# sourceMappingURL=index.d.ts.map