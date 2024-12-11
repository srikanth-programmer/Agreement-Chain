"use client";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { defineChain, prepareContractCall, prepareEvent } from "thirdweb";
import {
  useContractEvents,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { getContract } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { Badge } from "@/components/ui/badge";
import { sepolia } from "thirdweb/chains";
import { client } from "../../client";
import { ethers } from "ethers";
import { useContractContext } from "../../providers/ContractProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddressBadge from "../AddressBadge"; // Corrected Import
import { ChevronDown, ChevronUp } from "lucide-react";
import { getRpcClient, eth_blockNumber } from "thirdweb/rpc";
import Toast from "../toast";
import Skeleton from "../Skeleton/Skeleton";

declare global {
  interface Window {
    ethereum: any;
  }
}

interface Condition {
  conditionId: string;
  key: string;
  value: string;
}

interface ConditionDetails {
  key: string;
  value: string;
  active: number;
  approvalCount: number;
  rejectionCount: number;
  totalRequired: number;
  userApprovalStatus: number;
}

function formatConditionDetails(condition: any): ConditionDetails {
  return {
    key: condition.key,
    value: condition.value,
    active: condition.active,
    approvalCount: Number(condition.approvalCount),
    rejectionCount: Number(condition.rejectionCount),
    totalRequired: Number(condition.totalRequired),
    userApprovalStatus: condition.userApprovalStatus,
  };
}

const preparedEvent = prepareEvent({
  signature:
    "event ConditionAdded(bytes32 indexed conditionId, string key, string value)",
});

const ConditionView = ({ address }: { address: string }) => {
  const [selectedOption, setSelectedOption] = useState("contractInfo"); // State for Select component
  const { contractData } = useContractContext();

  // States for Add Condition Dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddConditionLoading, setIsAddConditionLoading] = useState(false);
  const [newConditionKey, setNewConditionKey] = useState("");
  const [newConditionValue, setNewConditionValue] = useState("");

  // States for Remove Condition Dialog
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isRemoveConditionLoading, setIsRemoveConditionLoading] =
    useState(false);
  const [conditionToRemove, setConditionToRemove] = useState("");

  const [toastProps, setToastProps] = useState<{
    message: string;
    variant: "success" | "failure";
  } | null>(null);

  const showSuccessToast = (_message: string) => {
    setToastProps({ message: _message, variant: "success" });
  };

  const showFailureToast = (_message: string) => {
    setToastProps({ message: _message, variant: "failure" });
  };

  const contract = getContract({
    client,
    chain: sepolia,
    address,
  });
  const title = contractData?.title;
  const description = contractData?.description;

  const { data: stakeHolderList, isPending } = useReadContract({
    contract,
    method: "function getStakeholders() view returns (address[])",
    params: [],
  });

  const { data: activeConditions } = useReadContract({
    contract,
    method:
      "function getAllActiveConditions() view returns ((string key, string value, uint8 active, uint256 approvalCount, uint256 rejectionCount, uint256 totalRequired, uint8 userApprovalStatus)[] conditionViews)",
    params: [],
  });
  const { mutate: sendTransaction } = useSendTransaction();

  const handleAddCondition = () => {
    if (!newConditionKey || !newConditionValue) {
      showFailureToast("Please provide both key and value for the condition.");

      return;
    }
    setIsAddConditionLoading(true);
    const transaction = prepareContractCall({
      contract,
      method: "function addCondition(string key, string value)",
      params: [newConditionKey, newConditionValue],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        showSuccessToast("Condition Request added Successfully");
        setNewConditionKey("");
        setNewConditionValue("");
        setIsAddDialogOpen(false);
        setIsAddConditionLoading(false);
      },
      onError: (error: any) => {
        let errorMessage = "Transaction failed.";
        if (error.message) {
          const match = error.message.match(/Error - (.+)/);
          if (match && match[1]) {
            errorMessage = match[1];
          }
        }
        showFailureToast(errorMessage);

        setIsAddConditionLoading(false);
        setIsAddDialogOpen(false);
      },
    });
  };

  // Handler to remove a condition
  const handleRemoveCondition = () => {
    if (!conditionToRemove) {
      showFailureToast("Please select a condition to remove");
      return;
    }
    setIsRemoveConditionLoading(true);
    const transaction = prepareContractCall({
      contract,
      method: "function createAction(uint8 _type, string _key)",
      params: [2, conditionToRemove],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        showSuccessToast("Condition Remove request added successfully");
        setConditionToRemove("");
        setIsRemoveDialogOpen(false);
        setIsRemoveConditionLoading(false);
      },
      onError: (error: any) => {
        let errorMessage = "Transaction failed.";
        if (error.message) {
          const match = error.message.match(/Error - (.+)/);
          if (match && match[1]) {
            errorMessage = match[1];
          }
        }
        showFailureToast(errorMessage);
        setIsRemoveConditionLoading(false);
        setIsRemoveDialogOpen(false);
      },
    });

    // Reset and close the dialog
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[30rem] scroll-m-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contract Information</h2>
          <Select
            value={selectedOption}
            onValueChange={(value) => setSelectedOption(value)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contractInfo">Contract Info</SelectItem>

              <SelectItem value="pendingConditions">
                Pending Conditions
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Conditional Rendering Based on Selected Option */}
        {selectedOption === "contractInfo" && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Description</h4>
              <p className="text-text-secondary">{description}</p>
            </div>
            <div>
              <h4 className="font-semibold">Current Stakeholders</h4>
              <div className="mt-2">
                {stakeHolderList &&
                  stakeHolderList.map((address, index) => (
                    <AddressBadge address={address} key={index} />
                  ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Contract Conditions</h4>
                {/* Manage Conditions Button with Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">Manage Conditions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsAddDialogOpen(true)}>
                      Add Condition
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setIsRemoveDialogOpen(true)}
                    >
                      Remove Condition
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ul className="list-disc pl-4 mt-2">
                {!activeConditions?.length ? (
                  <p className="text-text-secondary">
                    No active conditions found.
                  </p>
                ) : (
                  activeConditions.map((condition, index) => (
                    <div
                      key={index}
                      className="flex flex-col mb-4 md:flex-row items-start md:items-center md:space-x-4 space-x-5 space-y-4 "
                    >
                      {/* Key Input */}
                      <div className="w-full md:w-1/3">
                        <Input
                          value={condition.key}
                          disabled
                          className="w-full !cursor-default font-semibold !disabled:opacity-100  !first-letter:uppercase "
                          readOnly
                        />
                      </div>

                      {/* Value Input */}
                      <div className="w-full md:w-1/3 !m-0 !ml-5">
                        <Input
                          value={condition.value}
                          disabled
                          className="w-full !cursor-default font-semibold !disabled:opacity-100  !first-letter:uppercase "
                          readOnly
                        />
                      </div>
                    </div>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}

        {selectedOption === "pendingConditions" && (
          <ConditionApproval address={address} />
        )}
        {/* Add Condition Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            {/* The trigger is handled by DropdownMenuItem */}
            <span></span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Condition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Condition Key"
                value={newConditionKey}
                onChange={(e) => setNewConditionKey(e.target.value)}
              />
              <Input
                placeholder="Condition Value"
                value={newConditionValue}
                onChange={(e) => setNewConditionValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              {isAddConditionLoading ? (
                <LoadingButton />
              ) : (
                <Button onClick={handleAddCondition}>Add</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Remove Condition Dialog */}
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogTrigger asChild>
            {/* The trigger is handled by DropdownMenuItem */}
            <span></span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Condition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={conditionToRemove}
                onValueChange={(value) => setConditionToRemove(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Condition" />
                </SelectTrigger>
                <SelectContent>
                  {activeConditions && activeConditions.length > 0 ? (
                    activeConditions.map((condition, index) => (
                      <SelectItem key={index} value={condition.key}>
                        {condition.key} / {condition.value}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No conditions available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setIsRemoveDialogOpen(false)}
              >
                Cancel
              </Button>

              {isRemoveConditionLoading ? (
                <LoadingButton />
              ) : (
                <Button onClick={handleRemoveCondition}>Remove</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>

      {toastProps && (
        <Toast message={toastProps.message} variant={toastProps.variant} />
      )}
    </Card>
  );
};

const ConditionFetcher = ({
  contract,
  conditionId,
  conditionKey,
  onDataFetched,
}: {
  contract: any;
  conditionId: string;
  conditionKey: string;
  onDataFetched: (data: any) => void;
}) => {
  const { data } = useReadContract({
    contract,
    method:
      "function getConditionDetails(string _key) view returns ((string key, string value, uint8 active, uint256 approvalCount, uint256 rejectionCount, uint256 totalRequired, uint8 userApprovalStatus))",
    params: [conditionKey],
    from: useActiveAccount()?.address,
  });

  useEffect(() => {
    if (data && data.active === 0) {
      onDataFetched({
        conditionId,
        conditionKey,
        details: formatConditionDetails(data),
      });
    }
  }, [data, conditionId, conditionKey, onDataFetched]);

  return null;
};

export function ConditionApproval({ address }: { address: string }) {
  const [conditionIds, setConditionIds] = useState<string[]>([]);
  const [nonActiveConditions, setNonActiveConditions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchedCount, setFetchedCount] = useState(0);

  const [blockNumber, setBlockNumber] = useState<number>(900000);
  const processedConditionsRef = useRef<Set<string>>(new Set());

  const contract = getContract({
    client,
    chain: sepolia,
    address: address,
  });

  const { data: event } = useContractEvents({
    contract,
    events: [preparedEvent],
    blockRange: blockNumber,
  });

  useEffect(() => {
    const fetchBlockNumber = async () => {
      try {
        const rpcRequest = getRpcClient({ client, chain: sepolia });
        const fetchedBlockNumber = await eth_blockNumber(rpcRequest);

        setBlockNumber(Number(fetchedBlockNumber));
      } catch (error) {
        console.error("Failed to fetch block number:", error);
      }
    };

    fetchBlockNumber();
  }, [event]);

  const uniqueIds = useMemo(() => {
    if (!event) return [];

    const ids = event.map((e: any) => [e.args.conditionId, e.args.key]);

    // Deduplicate conditionIds
    const uniqueIds = Array.from(
      new Set(ids.map((id) => JSON.stringify(id)))
    ).map((id) => JSON.parse(id));

    return uniqueIds;
  }, [event]);
  useEffect(() => {
    if (!uniqueIds.length) return;

    setLoading(true);
    setConditionIds(uniqueIds);
    setFetchedCount(0);
    setNonActiveConditions([]);
  }, [uniqueIds]);

  useEffect(() => {
    if (
      fetchedCount === conditionIds.length ||
      (fetchedCount === 0 && nonActiveConditions.length == 0) ||
      nonActiveConditions.length == 0
    ) {
      setLoading(false);
    }
  }, [fetchedCount, conditionIds.length]);

  const handleConditionFetched = useCallback((condition: any) => {
    const uniqueKey = `${condition.conditionId}-${condition.conditionKey}`;
    if (processedConditionsRef.current.has(uniqueKey)) {
      return; // Already processed
    }
    processedConditionsRef.current.add(uniqueKey);

    setNonActiveConditions((prev) => {
      return [...prev, condition];
    });
    setFetchedCount((prev) => {
      return prev + 1;
    });
  }, []);

  return (
    <div className="container mx-auto p-4">
      {conditionIds.map(([conditionId, conditionKey]) => (
        <ConditionFetcher
          key={conditionId}
          contract={contract}
          conditionId={conditionId}
          conditionKey={conditionKey}
          onDataFetched={handleConditionFetched}
        />
      ))}
      <table className="min-w-full table-auto bg-white dark:bg-gray-800">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b ">Field of Value</th>
            <th className="py-2 px-4 border-b ">Type of Request</th>
            <th className="py-2 px-4 border-b ">Approved Count</th>
            <th className="py-2 px-4 border-b ">Rejected Count</th>
            <th className="py-2 px-4 border-b "> Action</th>
            <th className="py-2 px-4 border-b "> </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [1, 2, 3].map((item) => (
              <tr key={item}>
                <td className="py-2 px-4 border-b ">
                  <Skeleton width="100%" height="20px" styleClass="mx-auto" />
                </td>
                <td className="py-2 px-4 border-b ">
                  <Skeleton width="100%" height="20px" styleClass="mx-auto" />
                </td>
                <td className="py-2 px-4 border-b ">
                  <span className="w-full">
                    <Skeleton width="50%" height="20px" styleClass="mx-auto" />
                  </span>
                </td>
                <td className="py-2 px-4 border-b ">
                  <Skeleton width="50%" height="20px" styleClass="mx-auto" />
                </td>
                <td className="py-2 px-4 border-b ">
                  <div className="flex !space-x-1">
                    <Skeleton width="80px" height="30px" styleClass="mx-auto" />
                    <Skeleton width="80px" height="30px" styleClass="mx-auto" />
                  </div>
                </td>
                <td className="py-2 px-4 border-b "></td>
              </tr>
            ))
          ) : nonActiveConditions.length > 0 ? (
            nonActiveConditions.map(
              ({ conditionId, conditionKey, details }, index) => (
                <ConditionDetailsComponent
                  key={conditionId + index}
                  contractAddress={address as string}
                  conditionId={conditionId}
                  conditionKey={conditionKey}
                  conditionDetailsInfo={details}
                  event={event?.find((e: any) => e.args.key === conditionKey)}
                />
              )
            )
          ) : (
            <tr>
              <td
                colSpan={6}
                className="py-10  text-center text-lg font-semibold text-gray-500 dark:text-gray-300"
              >
                No Pending Condition Requests
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export default ConditionView;
// export { ConditionDetailsComponent, ConditionApproval, ConditionFetcher };

interface ConditionDetailsProps {
  contractAddress: string;
  conditionKey: string;
  conditionId: string;
  conditionDetailsInfo: ConditionDetails;
  event: any;
}

export function ConditionDetailsComponent({
  contractAddress,
  conditionKey,
  conditionId,
  conditionDetailsInfo,
  event,
}: ConditionDetailsProps) {
  const [condition, setCondition] =
    useState<ConditionDetails>(conditionDetailsInfo);
  const [display, setDisplay] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [approvers, setApprovers] = useState<readonly string[]>([]);
  const [rejectors, setRejectors] = useState<readonly string[]>([]);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);
  const [transactionTimestamp, setTransactionTimestamp] = useState<
    string | null
  >(null);
  const [isTransactionDetailsLoading, setIsTransactionDetailsLoading] =
    useState(true);
  const [toastProps, setToastProps] = useState<{
    message: string;
    variant: "success" | "failure";
  } | null>(null);

  const showSuccessToast = (_message: string) => {
    setToastProps({ message: _message, variant: "success" });
  };

  const showFailureToast = (_message: string) => {
    setToastProps({ message: _message, variant: "failure" });
  };

  const currentUser = useActiveAccount();
  const contract = getContract({
    client,
    chain: sepolia,
    address: contractAddress,
  });

  const { data: approversList, isPending: isApproverPending } = useReadContract(
    {
      contract,
      method: "function getApprovers(string _key) view returns (address[])",
      params: [conditionKey],
    }
  );

  const { data: rejectorsList, isPending: isRejectorPending } = useReadContract(
    {
      contract,
      method: "function getRejectors(string _key) view returns (address[])",
      params: [conditionKey],
    }
  );

  const { mutate: sendTransaction } = useSendTransaction();

  const onApprove = (_approved: boolean) => {
    const transaction = prepareContractCall({
      contract,
      method: "function approveCondition(bytes32 conditionId, bool _approved)",
      params: [`0x${conditionId.split("x")[1]}`, _approved],
    });

    sendTransaction(transaction, {
      onSuccess: () => {
        showSuccessToast("Voted Successfully");
      },
      onError: (error: any) => {
        let errorMessage = "Transaction failed.";
        if (error.message) {
          const match = error.message.match(/Error - (.+)/);
          if (match && match[1]) {
            errorMessage = match[1];
          }
        }
        showFailureToast(errorMessage);
      },
    });
  };

  useEffect(() => {
    if (approversList) {
      setApprovers(approversList);
    }
    if (rejectorsList) {
      setRejectors(rejectorsList);
    }

    const fetchTransactionDetails = async () => {
      if (event) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const tx = await provider.getTransaction(event.transactionHash);
        const receipt = await provider.getTransactionReceipt(
          event.transactionHash
        );
        if (tx.blockNumber) {
          const block = await provider.getBlock(tx.blockNumber);
          const timestamp = block.timestamp;
          setTransactionTimestamp(new Date(timestamp * 1000).toLocaleString()); // Format timestamp
        }
        setTransactionDetails({ tx, receipt });

        setIsTransactionDetailsLoading(false);
      }
    };
    fetchTransactionDetails();
  }, [event, approversList, rejectorsList]);

  if (!condition && display) {
    return (
      <Fragment>
        <tr>
          <td aria-colspan={6}>Loading...</td>
        </tr>
      </Fragment>
    );
  }

  return (
    <React.Fragment>
      <>
        <tr key={condition?.key}>
          <td className="py-2 px-4 border-b text-center">Condition Approval</td>
          <td className="py-2 px-4 border-b text-center">
            {condition?.key} / {condition?.value}
          </td>
          <td className="py-2 px-4 border-b text-center">
            {condition?.approvalCount}
          </td>
          <td className="py-2 px-4 border-b text-center">
            {condition?.rejectionCount}
          </td>
          <td className="py-2 px-4 border-b text-center">
            {condition?.userApprovalStatus === 0 ? (
              <div className="space-x-2">
                <Button onClick={() => onApprove(true)}>Approve</Button>
                <Button variant="destructive" onClick={() => onApprove(false)}>
                  Reject
                </Button>
              </div>
            ) : condition?.userApprovalStatus === 1 ? (
              <Badge variant="default">Approved</Badge>
            ) : (
              <Badge variant="destructive">Rejected</Badge>
            )}
          </td>
          <td
            onClick={() => setIsOpen(!isOpen)}
            className="py-2 px-4 border-b  cursor-pointer"
          >
            {isOpen ? (
              <ChevronUp className="inline" />
            ) : (
              <ChevronDown className="inline" />
            )}
          </td>
        </tr>
        {isOpen && (
          <tr>
            <td colSpan={6} className="py-2 px-4 border-b">
              <div className="space-y-2 p-4 bg-gray-100 dark:bg-gray-700">
                <div className="flex">
                  <span className="font-semibold w-40">Condition ID:</span>
                  <AddressBadge address={conditionId} />
                </div>
                <div className="flex">
                  <span className="font-semibold w-40">Initiator:</span>
                  {!isTransactionDetailsLoading ? (
                    <AddressBadge address={transactionDetails?.tx?.from} />
                  ) : (
                    <Skeleton
                      width="100px"
                      height="20px"
                      styleClass="m-0 flex items-start"
                    />
                  )}
                </div>
                <div className="flex">
                  <span className="font-semibold w-40">Time of Creation:</span>
                  {!isTransactionDetailsLoading ? (
                    <span>{transactionTimestamp}</span>
                  ) : (
                    <Skeleton
                      width="100px"
                      height="20px"
                      styleClass="m-0 flex items-start"
                    />
                  )}
                </div>
                <div className="flex">
                  <span className="font-semibold w-40">Approvers:</span>
                  <ul className="list-disc list-inside">
                    {approvers?.map((approver, index) => (
                      <li className="list-none" key={index}>
                        <AddressBadge address={approver} />
                      </li>
                    ))}
                    {isApproverPending && (
                      <span className="flex justify-start space-x-2">
                        <Skeleton width="100px" height="20px" />
                        <Skeleton width="100px" height="20px" />
                      </span>
                    )}
                  </ul>
                </div>
                <div className="flex">
                  <span className="font-semibold w-40">Rejectors:</span>
                  <ul className="list-disc list-inside">
                    {rejectors?.map((rejector, index) => (
                      <li className="list-none" key={index}>
                        <AddressBadge address={rejector} />
                      </li>
                    ))}
                    {isRejectorPending && (
                      <span className="flex justify-start space-x-2">
                        <Skeleton width="100px" height="20px" />
                        <Skeleton width="100px" height="20px" />
                      </span>
                    )}
                  </ul>
                </div>
              </div>
            </td>
          </tr>
        )}
        {toastProps && (
          <Toast message={toastProps.message} variant={toastProps.variant} />
        )}
      </>
    </React.Fragment>
  );
}

export function LoadingButton({
  children = "Waiting...",
  className = "",
  ...props
}) {
  return (
    <Button
      disabled
      className={`
        relative
        inline-flex
        items-center
        text-sm
        px-5
        py-2.5
        font-medium
        rounded-lg
        bg-primary
        text-primary-foreground
        hover:bg-secondary
        focus:ring-accent
        ${className}
      `}
      {...props}
    >
      <svg
        aria-hidden="true"
        role="status"
        className="inline w-4 h-4 me-3 text-current animate-spin"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
          className="opacity-20"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentColor"
        />
      </svg>
      {children}
    </Button>
  );
}
