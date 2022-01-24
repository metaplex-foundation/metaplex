"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumericInput = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
class NumericInput extends react_1.default.Component {
    constructor() {
        super(...arguments);
        this.onChange = (e) => {
            const { value } = e.target;
            const reg = /^-?\d*(\.\d*)?$/;
            if (reg.test(value) || value === '' || value === '-') {
                this.props.onChange(value);
            }
        };
        // '.' at the end or only '-' in the input box.
        this.onBlur = () => {
            const { value, onBlur, onChange } = this.props;
            let valueTemp = value;
            if (value === undefined || value === null)
                return;
            if (value.charAt &&
                (value.charAt(value.length - 1) === '.' || value === '-')) {
                valueTemp = value.slice(0, -1);
            }
            if (value.startsWith && (value.startsWith('.') || value.startsWith('-.'))) {
                valueTemp = valueTemp.replace('.', '0.');
            }
            if (valueTemp.replace)
                onChange === null || onChange === void 0 ? void 0 : onChange(valueTemp.replace(/0*(\d+)/, '$1'));
            if (onBlur) {
                onBlur();
            }
        };
    }
    render() {
        return (react_1.default.createElement(antd_1.Input, { ...this.props, onChange: this.onChange, onBlur: this.onBlur, maxLength: 25 }));
    }
}
exports.NumericInput = NumericInput;
//# sourceMappingURL=numeric.js.map