"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { ThemeProvider } from "./ThemeProvider";
import { ContractProvider } from "./ContractProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThirdwebProvider>
      <ContractProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </ContractProvider>
    </ThirdwebProvider>
  );
}
