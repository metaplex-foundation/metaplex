"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackSetState = exports.PackKey = exports.PackDistributionType = void 0;
var PackDistributionType;
(function (PackDistributionType) {
    PackDistributionType[PackDistributionType["MaxSupply"] = 0] = "MaxSupply";
    PackDistributionType[PackDistributionType["Fixed"] = 1] = "Fixed";
    PackDistributionType[PackDistributionType["Unlimited"] = 2] = "Unlimited";
})(PackDistributionType = exports.PackDistributionType || (exports.PackDistributionType = {}));
var PackKey;
(function (PackKey) {
    PackKey[PackKey["Uninitialized"] = 0] = "Uninitialized";
    PackKey[PackKey["PackSet"] = 1] = "PackSet";
    PackKey[PackKey["PackCard"] = 2] = "PackCard";
    PackKey[PackKey["PackVoucher"] = 3] = "PackVoucher";
    PackKey[PackKey["ProvingProcess"] = 4] = "ProvingProcess";
})(PackKey = exports.PackKey || (exports.PackKey = {}));
var PackSetState;
(function (PackSetState) {
    PackSetState[PackSetState["NotActivated"] = 0] = "NotActivated";
    PackSetState[PackSetState["Activated"] = 1] = "Activated";
    PackSetState[PackSetState["Deactivated"] = 2] = "Deactivated";
    PackSetState[PackSetState["Ended"] = 3] = "Ended";
})(PackSetState = exports.PackSetState || (exports.PackSetState = {}));
//# sourceMappingURL=types.js.map