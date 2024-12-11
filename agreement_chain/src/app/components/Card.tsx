"use client";
import React from "react";
import { getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { MoreVertical, Edit, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useContractContext } from "../providers/ContractProvider";
import { useRouter } from "next/navigation";

interface ContractCardProps {
  contractAddress: string;
  client: any;
  chain: any;
}

type AgreementState = "PendingApproval" | "Active" | "Cancelled" | "Paused";

const getStateLabel = (state: number): AgreementState => {
  const states: AgreementState[] = [
    "PendingApproval",
    "Active",
    "Cancelled",
    "Paused",
  ];

  return states[state] || "Pending Approval";
};

const statusStyles: Record<AgreementState, string> = {
  PendingApproval: "bg-yellow-100 text-yellow-800",
  Active: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Paused: "bg-blue-100 text-blue-800",
};

const getStatusStyles = (state: number): string => {
  const stateLabel = getStateLabel(state);
  return statusStyles[stateLabel];
};

const ContractCard = ({
  contractAddress,
  client,
  chain,
}: ContractCardProps) => {
  const { setContractData } = useContractContext();
  const router = useRouter();

  const contract = getContract({
    client,
    chain,
    address: contractAddress,
  });

  const { data: title, isLoading: isTitleLoading } = useReadContract({
    contract,
    method: "function title() view returns (string)",
    params: [],
  });

  const { data: description, isLoading: isDescriptionLoading } =
    useReadContract({
      contract,
      method: "function description() view returns (string)",
      params: [],
    });

  const { data: TOTAL_STAKE_HOLDERS } = useReadContract({
    contract,
    method: "function TOTAL_STAKE_HOLDERS() view returns (uint256)",
    params: [],
  });

  const { data: currentState } = useReadContract({
    contract,
    method: "function currentState() view returns (uint8)",
    params: [],
  });
  const handleViewContract = () => {
    if (title && description) setContractData({ title, description });
    router.push(`/contract/${contractAddress}/view`);
  };

  const getImageNumber = (index: string): number => {
    const numericIndex = parseInt(index.slice(-4), 16);
    return (numericIndex % 5) + 1;
  };
  const imageNumber = getImageNumber(contractAddress);

  return isTitleLoading || isDescriptionLoading ? (
    <CardLoader />
  ) : (
    <div className="bg-background dark:bg-dark-background min-h-96 my-auto border-gray-200 dark:border-gray-600  hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden shadow-md">
      <img
        className="w-full h-48 object-cover"
        src={`/${imageNumber}.png`}
        alt={title}
      />
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-primary dark:text-primary">
            {title}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <MoreVertical className="h-5 w-5 text-text-secondary dark:text-text-secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleViewContract}>
                <Eye className="mr-2 h-4 w-4" />
                Show Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-text-secondary dark:text-text-secondary mt-2">
          {description}
        </p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-text-secondary dark:text-text-secondary">
            Stakeholders: {Number(TOTAL_STAKE_HOLDERS)}
          </span>
          {currentState != undefined && (
            <Badge className={getStatusStyles(currentState)}>
              {getStateLabel(currentState)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Card component with types

const CardLoader = () => {
  return (
    <div className="w-full max-w-2xl p-6 bg-card rounded-lg border border-border animate-pulse">
      <div className="flex items-center !w-auto justify-center   h-48 bg-gray-300 rounded sm:w-96 dark:bg-gray-700">
        <svg
          className="w-10 h-10 text-gray-200 dark:text-gray-600"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 18"
        >
          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z" />
        </svg>
      </div>
      <div className="h-6 mt-5 bg-gray-300 dark:bg-gray-700  rounded-md w-3/4 mb-4"></div>

      {/* Description skeleton - multiple lines */}
      <div className="space-y-2 mb-6">
        <div className="h-4    bg-gray-300 dark:bg-gray-700 rounded-md w-full"></div>
        <div className="h-4  bg-gray-300 dark:bg-gray-700  rounded-md w-5/6"></div>
        <div className="h-4  bg-gray-300 dark:bg-gray-700  rounded-md w-4/6"></div>
      </div>

      {/* Footer section */}
      <div className="flex justify-between items-center">
        {/* Stakeholders skeleton */}
        <div className="flex gap-2">
          <div className="h-8 w-8  bg-gray-300 dark:bg-gray-700  rounded-full"></div>
          <div className="h-8 w-8  bg-gray-300 dark:bg-gray-700  rounded-full"></div>
          <div className="h-8 w-8  bg-gray-300 dark:bg-gray-700  rounded-full"></div>
        </div>

        {/* Status skeleton */}
        <div className="h-6  bg-gray-300 dark:bg-gray-700  rounded-full w-24"></div>
      </div>
    </div>
  );
};

const Cardcomponents = { ContractCard };
export default Cardcomponents;
