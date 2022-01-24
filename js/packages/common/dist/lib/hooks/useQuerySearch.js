"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQuerySearch = void 0;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
function useQuerySearch() {
    const { search } = (0, react_router_dom_1.useLocation)();
    return (0, react_1.useMemo)(() => new URLSearchParams(search), [search]);
}
exports.useQuerySearch = useQuerySearch;
//# sourceMappingURL=useQuerySearch.js.map