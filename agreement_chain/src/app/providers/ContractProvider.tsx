"use client";
import React, { createContext, useState, ReactNode, useContext } from "react";

interface ContractData {
  title: string;
  description: string;

  // Add other fields as necessary
}

interface ContractContextProps {
  contractData: ContractData | null;
  setContractData: (data: ContractData) => void;
}

const ContractContext = createContext<ContractContextProps>({
  contractData: null,
  setContractData: () => {},
});

export const ContractProvider = ({ children }: { children: ReactNode }) => {
  const [contractData, setContractData] = useState<ContractData | null>(null);

  return (
    <ContractContext.Provider value={{ contractData, setContractData }}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContractContext = () => useContext(ContractContext);
