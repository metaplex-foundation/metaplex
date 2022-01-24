"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = void 0;
const react_1 = __importDefault(require("react"));
const antd_1 = require("antd");
// import Link from '../components/Link';
function notify({ message = '', description = undefined, txid = '', type = 'info', placement = 'bottomLeft', }) {
    if (txid) {
        //   <Link
        //     external
        //     to={'https://explorer.solana.com/tx/' + txid}
        //     style={{ color: '#0000ff' }}
        //   >
        //     View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
        //   </Link>
        description = react_1.default.createElement(react_1.default.Fragment, null);
    }
    antd_1.notification[type]({
        message: react_1.default.createElement("span", { style: { color: 'black' } }, message),
        description: (react_1.default.createElement("span", { style: { color: 'black', opacity: 0.5 } }, description)),
        placement,
        style: {
            backgroundColor: 'white',
        },
    });
}
exports.notify = notify;
//# sourceMappingURL=notifications.js.map