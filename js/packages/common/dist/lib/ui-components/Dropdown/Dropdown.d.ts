import { FC } from 'react';
export interface DropdownProps {
    [x: string]: any;
    children?: any;
    open?: boolean;
}
export interface DropdownBodyProps {
    [x: string]: any;
    children?: any;
    className?: string;
    width?: number | string;
    align?: 'left' | 'right' | 'center';
}
export interface DropDownToggleProps {
    [x: string]: any;
    children?: any;
    className?: string;
    onClick?: any;
}
export interface DropDownMenuItemProps {
    [x: string]: any;
    children?: any;
    className?: string;
    onClick?: any;
    iconBefore?: any;
}
export declare const DropDownBody: ({ children, className, width, align, }: DropdownBodyProps) => JSX.Element;
export declare const DropDownToggle: ({ children, className, onClick, }: DropDownToggleProps) => JSX.Element;
export declare const DropDownMenuItem: ({ children, className, onClick, iconBefore, }: DropDownMenuItemProps) => JSX.Element;
export declare const Dropdown: FC<DropdownProps>;
export default Dropdown;
//# sourceMappingURL=Dropdown.d.ts.map