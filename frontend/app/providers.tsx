"use client";
import { Provider } from "@ckb-ccc/connector-react";
export function Providers({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
