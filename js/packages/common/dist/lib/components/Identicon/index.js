"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Identicon = void 0;
const react_1 = __importStar(require("react"));
const jazzicon_1 = __importDefault(require("jazzicon"));
const bs58_1 = __importDefault(require("bs58"));
const Identicon = (props) => {
    var _a;
    const { style, className, alt } = props;
    const address = typeof props.address === 'string'
        ? props.address
        : (_a = props.address) === null || _a === void 0 ? void 0 : _a.toBase58();
    const ref = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        if (address && ref.current) {
            try {
                ref.current.innerHTML = '';
                ref.current.className = className || '';
                ref.current.appendChild((0, jazzicon_1.default)((style === null || style === void 0 ? void 0 : style.width) || 16, parseInt(bs58_1.default.decode(address).toString('hex').slice(5, 15), 16)));
            }
            catch (err) {
                // TODO
            }
        }
    }, [address, style, className]);
    return (react_1.default.createElement("div", { className: "identicon-wrapper", title: alt, ref: ref, style: props.style }));
};
exports.Identicon = Identicon;
//# sourceMappingURL=index.js.map