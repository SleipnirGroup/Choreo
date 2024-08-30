import { createContext } from "react";

export const DOMMatrixIdentity = DOMMatrix.fromFloat32Array(
  Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
);
export const FieldMatrixContext = createContext(DOMMatrixIdentity);
