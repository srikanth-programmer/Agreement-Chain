"use client";
import React from "react";

import { useParams, useRouter } from "next/navigation";
import ContractView from "@/app/components/viewContract";

export default function ContractViewPage() {
  const params = useParams();
  const contractAddress = params?.walletAddress;

  return <ContractView address={contractAddress as string} />;
}
