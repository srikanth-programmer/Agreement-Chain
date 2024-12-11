"use client";
import Cardcomponents from "@/app/components/Card";
import Link from "next/link";
import React, { useState } from "react";
import { AGREEMENT_FACTORY } from "@/app/constants/contract";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { client } from "@/app/client";
import { sepolia } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { Plus } from "lucide-react";

const dashboard = () => {
  const { ContractCard } = Cardcomponents;

  const contract = getContract({
    client: client,
    chain: sepolia,
    address: AGREEMENT_FACTORY,
  });

  const account = useActiveAccount();
  // fetch all contract to the user
  const { data: contractList, isPending } = useReadContract({
    contract,
    method:
      "function getStakeholderAgreements(address _stakeholder) view returns (address[])",
    params: [account?.address as string],
  });

  return (
    <div className="container mx-auto px-4 top-8 mt-10">
      <div className="bg-background dark:bg-background min-h-screen ">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-lg text-primary dark:text-primary">
            Your Agreements
          </div>
          <div>
            <Link href="/create-contract">
              <button className="px-8 py-4 cursor-pointer rounded-lg p-2 bg-primary text-primary-foreground hover:bg-background-secondary dark:hover:bg-dark-background-secondary transition-colors ext-lg font-medium flex items-center justify-center space-x-2 mx-auto md:mx-0">
                <span>Create New</span>
                <Plus className="w-7 h-7 dark:text-gray-900 light:text-white" />
              </button>
            </Link>
          </div>
        </div>

        <div className=" mt-10   lg:grid-cols-4  grid grid-cols-1 sm:grid-cols-2 gap-6">
          {contractList && contractList.length > 0 ? (
            contractList.map((contractAddress, index) => (
              <div key={index}>
                <ContractCard
                  contractAddress={contractAddress}
                  client={client}
                  chain={sepolia}
                />
              </div>
            ))
          ) : (
            <p>No contracts found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default dashboard;
