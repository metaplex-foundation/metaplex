"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useThatState = void 0;
const react_1 = require("react");
// Extends useState() hook with async getThatState getter which can be used to get state value in contexts (ex. async callbacks) where up to date state is not available
function useThatState(initialState) {
    const [state, setState] = (0, react_1.useState)(initialState);
    const getThatState = () => new Promise(resolve => {
        // Use NOP setState call to retrieve current state value
        setState(s => {
            resolve(s);
            return s;
        });
    });
    return [state, setState, getThatState];
}
exports.useThatState = useThatState;
//# sourceMappingURL=useThatState.js.map