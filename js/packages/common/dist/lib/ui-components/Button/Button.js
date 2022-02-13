"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const react_1 = __importDefault(require("react"));
const classnames_1 = __importDefault(require("classnames"));
const Button = ({ view, children, className, iconAfter, iconBefore, onClick, size, appearance, ...restProps }) => {
    const ButtonClasses = (0, classnames_1.default)(`button rounded-[6px] inline-flex items-center justify-center font-500 border-2 border-transparent transition-colors gap-[8px] select-none`, className, {
        'h-[30px] px-[12px] text-sm': size === 'sm',
        'h-[38px] px-[12px] text-base': size === 'md',
        'h-[42px] px-[16px]': size === 'lg',
        'bg-white': view === 'outline',
        'border-B-400 hover:bg-B-400 hover:text-white': view === 'outline' && appearance === 'primary',
        'border-gray-500 hover:bg-gray-500 hover:text-white': view === 'outline' && appearance === 'secondary',
        'border-gray-600 bg-transparent text-gray-600 hover:bg-gray-500 hover:text-white': view === 'outline' && appearance === 'ghost',
        'border-white bg-transparent text-white hover:bg-white hover:text-gray-600': view === 'outline' && appearance === 'ghost-invert',
        'bg-B-400 text-white hover:bg-B-500 hover:text-white': view === 'solid' && appearance === 'primary',
        'bg-gray-500 text-white hover:bg-gray-600': view === 'solid' && appearance === 'secondary',
        'bg-white text-gray-800 hover:bg-B-400 hover:text-white': view === 'solid' && appearance === 'ghost',
        'bg-white text-B-400 hover:bg-B-400 hover:text-white': view === 'solid' && appearance === 'ghost-invert',
    });
    return (react_1.default.createElement("button", { className: ButtonClasses, ...restProps, onClick: onClick },
        iconBefore && react_1.default.createElement("span", { className: "icon-before" }, iconBefore),
        react_1.default.createElement("div", { className: "content" },
            typeof children === 'function' && children({ onClick }),
            typeof children !== 'function' && children),
        iconAfter && react_1.default.createElement("span", { className: "icon-after" }, iconAfter)));
};
exports.Button = Button;
exports.Button.defaultProps = {
    size: 'md',
    view: 'solid',
    appearance: 'primary',
};
exports.default = exports.Button;
//# sourceMappingURL=Button.js.map