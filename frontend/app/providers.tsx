"use client";
import { Provider } from "@ckb-ccc/connector-react";
import { ThemeProvider } from "@/components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <ThemeProvider>{children}</ThemeProvider>
    </Provider>
  );
}
