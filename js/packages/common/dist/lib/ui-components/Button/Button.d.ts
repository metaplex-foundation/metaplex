import { FC } from 'react';
export interface ButtonProps {
    [x: string]: any;
    view?: 'outline' | 'solid';
    appearance?: 'primary' | 'secondary' | 'ghost' | 'ghost-invert';
    children?: any;
    iconAfter?: any;
    iconBefore?: any;
    onClick?: any;
    size?: 'sm' | 'md' | 'lg';
}
export declare const Button: FC<ButtonProps>;
export default Button;
//# sourceMappingURL=Button.d.ts.map