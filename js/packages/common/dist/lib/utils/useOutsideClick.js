"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOutsideClick = void 0;
const react_1 = require("react");
/**
 * Hook to handle outside click of dropdown
 */
const useOutsideClick = (ref, callBack, ignoreRef) => {
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            var _a;
            if ((ref === null || ref === void 0 ? void 0 : ref.current) && !ref.current.contains(event.target) && !ignoreRef) {
                callBack();
            }
            if ((ref === null || ref === void 0 ? void 0 : ref.current) &&
                !((_a = ref === null || ref === void 0 ? void 0 : ref.current) === null || _a === void 0 ? void 0 : _a.contains(event.target)) &&
                (ignoreRef === null || ignoreRef === void 0 ? void 0 : ignoreRef.current) &&
                !ignoreRef.current.contains(event.target)) {
                callBack();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref]);
};
exports.useOutsideClick = useOutsideClick;
//# sourceMappingURL=useOutsideClick.js.map