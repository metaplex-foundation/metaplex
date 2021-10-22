import { BN } from "bn.js";

export const bnConverter = {
  from: (obj: any) => {
    if (typeof obj === "string" || obj instanceof String) {
        return new BN(obj as string, "hex");
      }

      return obj;
  },
  to: (obj: any) => {
    if (obj instanceof BN) {
        return obj.toString("hex");
      }

      return obj;
  },
};
