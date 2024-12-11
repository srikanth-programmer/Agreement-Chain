"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  eth_blockNumber,
  getContract,
  getRpcClient,
  prepareContractCall,
  prepareEvent,
} from "thirdweb";
import {
  useActiveAccount,
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ethers } from "ethers";
import { client } from "../client";
import { sepolia } from "thirdweb/chains";
import { AGREEMENT_FACTORY } from "../constants/contract";
import AddressBadge from "./AddressBadge";
import { ArrowDownUp, ChevronDown, ChevronUp } from "lucide-react";
import { LoadingButton } from "./conditions/ConditionView";
import Toast from "./toast";
import Skeleton from "./Skeleton/Skeleton";

interface StakeholderAction {
  actionId: string;
  actionType: number; // 0 for Add, 1 for Remove
  address: string;
  timestamp: string;
  initiator: string;
  approvalCount: number;
  rejectionCount: number;
}
interface RequestType {
  _type: number;
  label: string;
  eventDetails: any[];
}
const StakeholderView = ({ address }: { address: string }) => {
  const [selectedOption, setSelectedOption] = useState("stakeholderInfo");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [origin, setOrigin] = useState("");
  const [transactionTimestamp, setTransactionTimestamp] = useState<
    string | null
  >(null);
  const [newStakeholderAddress, setNewStakeholderAddress] = useState("");
  const [pendingActions, setPendingActions] = useState<StakeholderAction[]>([]);
  const [addRequestEvent, setAddRequestEvent] = useState<any[]>([]);
  const [removeRequestEvent, setRemoveRequestEvent] = useState<any[]>([]);
  const [contractPauseEvent, setContractPauseEvent] = useState<any[]>([]);
  const [contractResumeEvent, setContractResumeEvent] = useState<any[]>([]);
  const [contractCancelEvent, setContractCancelEvent] = useState<any[]>([]);

  const [isAddConditionLoading, setIsAddConditionLoading] = useState(false);
  const [isRemoveConditionLoading, setIsRemoveConditionLoading] =
    useState(false);
  const [stakeHolderToRemove, setstakeHolderToRemove] = useState("");
  const [blockNumber, setBlockNumber] = useState<number>(900000);
  const [isTransactionDetailsLoading, setIsTransactionDetailsLoading] =
    useState(true);
  const [contractStateDialogOpen, setContractStateDialogOpen] = useState(false);
  const [isContractConditionLoading, setIsContractConditionLoading] =
    useState(false);
  const [contractStateContent, setContractStateContent] = useState<{
    title: string;
    description: string;
    type: number;
  } | null>(null);
  const [toastProps, setToastProps] = useState<{
    message: string;
    variant: "success" | "failure";
  } | null>(null);

  const [prevEventsLength, setPrevEventsLength] = useState(0);
  const [isLoadingNewEvents, setIsLoadingNewEvents] = useState(false);

  const showSuccessToast = (_message: string) => {
    setToastProps({ message: _message, variant: "success" });
  };

  const showFailureToast = (_message: string) => {
    setToastProps({ message: _message, variant: "failure" });
  };

  function getContractByAddress(address: string) {
    const contract = getContract({
      client,
      chain: sepolia,
      address,
    });
    return contract;
  }
  const contract = getContractByAddress(address);
  const agreementFactory = getContractByAddress(AGREEMENT_FACTORY);

  const contractCreationEvent = prepareEvent({
    signature:
      "event AgreementCreated(address indexed agreementAddress, address indexed creator)",
  });

  const { data: contractCreationData } = useContractEvents({
    contract: agreementFactory,
    events: [contractCreationEvent],
    blockRange: blockNumber,
  });

  useEffect(() => {
    let contractEvent: any;
    if (contractCreationData) {
      contractCreationData.map((e: any) => {
        if (e.args.agreementAddress === address) {
          contractEvent = e;
          return;
        }
      });
    }

    const fetchContractEventDetails = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tx = await provider.getTransaction(contractEvent.transactionHash);
      if (tx.blockNumber) {
        const blockNumber = await provider.getBlock(tx.blockNumber);
        const timestamp = new Date(blockNumber.timestamp * 1000);
        setTransactionTimestamp(timestamp.toLocaleString());
      }
      // Get the transaction origin (sender)
      const origin = await signer.getAddress();
      setOrigin(origin);
      setIsTransactionDetailsLoading(false);
    };
    if (contractEvent) {
      fetchContractEventDetails();
    }
  }, [contractCreationData]);

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
  // Contract event for stakeholder actions
  const actionCreatedEvent = prepareEvent({
    signature:
      "event ActionCreated(bytes32 indexed actionId, uint8 actionType, string key)",
  });

  const { data: requestDataEvents, isPending: isEventsLoading } =
    useContractEvents({
      contract,
      events: [actionCreatedEvent],
      blockRange: blockNumber,
    });

  useEffect(() => {
    if (!requestDataEvents) return;
    if (prevEventsLength !== requestDataEvents.length) {
      setPrevEventsLength(requestDataEvents.length);
      setIsLoadingNewEvents(false);
    }
    requestDataEvents.map((event: any) => {
      switch (event.args.actionType) {
        case 0:
          setAddRequestEvent((prev) => [...prev, event]);
          break;
        case 1:
          setRemoveRequestEvent((prev) => [...prev, event]);
          break;
        case 3:
          setContractPauseEvent((prev) => [...prev, event]);
          break;
        case 4:
          setContractResumeEvent((prev) => [...prev, event]);
          break;
        case 5:
          setContractCancelEvent((prev) => [...prev, event]);
          break;
        default:
          break;
      }
    });
  }, [requestDataEvents]);

  // Get initial stakeholders
  const { data: stakeholders } = useReadContract({
    contract,
    method: "function getStakeholders() view returns (address[])",
    params: [],
  });

  // Toggle sort order handler
  const toggleSortOrder = useCallback(() => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  }, []);
  let skeletonLength = useMemo(() => {
    return [1, 2, 3];
  }, [address]);
  // Memoized requestTypes array
  const requestTypes: RequestType[] = useMemo(
    () => [
      { _type: 0, label: "Add", eventDetails: addRequestEvent },
      { _type: 1, label: "Remove", eventDetails: removeRequestEvent },
      { _type: 3, label: "Pause", eventDetails: contractPauseEvent },
      { _type: 4, label: "Resume", eventDetails: contractResumeEvent },
      { _type: 5, label: "Cancel", eventDetails: contractCancelEvent },
    ],
    [
      addRequestEvent,
      removeRequestEvent,
      contractPauseEvent,
      contractResumeEvent,
      contractCancelEvent,
    ]
  );

  // Sorted requestTypes based on sortOrder
  const sortedRequestTypes = useMemo(() => {
    return [...requestTypes].sort((a, b) => {
      if (sortOrder === "asc") {
        return a._type - b._type;
      } else {
        return b._type - a._type;
      }
    });
  }, [sortOrder, requestTypes]);

  const { mutate: sendTransaction } = useSendTransaction();

  // Handle new stakeholder request
  const handleAddStakeholder = () => {
    setIsAddConditionLoading(true);
    const transaction = prepareContractCall({
      contract,
      method: "function createAction(uint8 _type, string _key)",
      params: [0, newStakeholderAddress], // 0 for Add action type
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        setIsAddConditionLoading(false);
        setIsAddDialogOpen(false);
        showSuccessToast("Stakeholder Request added successfully.");
        setIsLoadingNewEvents(true);
        skeletonLength = new Array(1).fill(1); // Reset skeleton length
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

  const handleRemoveCondition = () => {
    setIsRemoveConditionLoading(true);
    const transaction = prepareContractCall({
      contract,
      method: "function createAction(uint8 _type, string _key)",
      params: [1, stakeHolderToRemove],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        setIsRemoveConditionLoading(false);
        setIsRemoveDialogOpen(false);
        showSuccessToast("Stakeholder Request added successfully.");
        setIsLoadingNewEvents(true);
        skeletonLength = new Array(1).fill(1); // Reset skeleton length
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
  };

  const handleContractState = () => {
    const _type = contractStateContent?.type;
    if (_type === undefined) {
      showFailureToast("Something went wrong. Please try again.");
      return;
    }
    const contractStateLabel = ["Pause", "Resume", "Cancel"];
    setIsContractConditionLoading(true);

    const currentDate = new Date().toLocaleString();
    const transaction = prepareContractCall({
      contract,
      method: "function createAction(uint8 _type, string _key)",
      params: [_type, contractStateLabel[_type - 3] + ` - ${currentDate}`],
    });
    sendTransaction(transaction, {
      onSuccess: () => {
        setIsContractConditionLoading(false);
        setContractStateDialogOpen(false);
        showSuccessToast(
          `${contractStateLabel[_type - 3]} Request added successfully.`
        );
        setIsLoadingNewEvents(true);
        skeletonLength = new Array(1).fill(1); // Reset skeleton length
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
        setIsContractConditionLoading(false);
        setContractStateDialogOpen(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stakeholder Management</CardTitle>
        <CardDescription>
          Manage contract stakeholders and contract states
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Stakeholder Information</h2>
          <Select value={selectedOption} onValueChange={setSelectedOption}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stakeholderInfo">Stakeholder Info</SelectItem>

              <SelectItem value="pendingRequests">
                Pending Stakeholder Requests
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedOption === "stakeholderInfo" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Current Stakeholders</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Manage Stakeholders</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setIsAddDialogOpen(true)}>
                    Add Stakeholder
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setIsRemoveDialogOpen(true)}
                  >
                    Remove Stakeholder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left py-2">Address</th>
                    <th className="text-left py-2">Added By</th>
                    <th className="text-left py-2">Timestamp</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stakeholders?.map((stakeholder: string, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">{`${stakeholder.substring(
                        0,
                        6
                      )}...${stakeholder.substring(38)}`}</td>
                      <td className="py-2">
                        {!isTransactionDetailsLoading ? (
                          <AddressBadge address={origin} />
                        ) : (
                          <Skeleton
                            width="100px"
                            height="20px"
                            styleClass="m-0 flex items-start"
                          />
                        )}
                      </td>
                      <td className="py-2">
                        {!isTransactionDetailsLoading ? (
                          <span> {transactionTimestamp} </span>
                        ) : (
                          <Skeleton
                            width="100px"
                            height="20px"
                            styleClass="m-0 flex items-start"
                          />
                        )}
                      </td>
                      <td className="py-2">
                        <Badge>Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedOption === "pendingRequests" && (
          <>
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">Manage Contract State</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => {
                      setContractStateDialogOpen(true);
                      setContractStateContent({
                        title: "Pause Contract",
                        description:
                          "Are you sure to pause contract. This will require majority of vote to pause contract ",
                        type: 3,
                      });
                    }}
                  >
                    Pause Contract
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setContractStateDialogOpen(true);
                      setContractStateContent({
                        title: "Resume Contract",
                        description:
                          "Are you sure to resume contract. This will require majority of vote to pause contract ",
                        type: 4,
                      });
                    }}
                  >
                    Resume Contract
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setContractStateDialogOpen(true);
                      setContractStateContent({
                        title: "Cancel Contract",
                        description:
                          "Are you sure to Cancel contract. This will require majority of vote to pause contract. Once approved no logger able to do operation on this agreement  ",
                        type: 5,
                      });
                    }}
                  >
                    Cancel Contract
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-4">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th
                      className="py-2 px-4 border-b cursor-pointer flex items-center"
                      onClick={toggleSortOrder}
                      aria-label={`Sort Type of Request ${
                        sortOrder === "asc" ? "descending" : "ascending"
                      }`}
                    >
                      Type of Request <ArrowDownUp className="ml-1 w-4 h-4" />
                    </th>
                    <th className="py-2 px-4 border-b">Field of Value</th>
                    <th className="py-2 px-4 border-b">Approved Count</th>
                    <th className="py-2 px-4 border-b">Rejected Count</th>
                    <th className="py-2 px-4 border-b"> Action</th>
                    <th className="py-2 px-4 border-b"> </th>
                  </tr>
                </thead>
                <tbody>
                  {isEventsLoading || isLoadingNewEvents ? (
                    skeletonLength.map((item) => (
                      <tr key={item}>
                        <td className="py-2 px-4 border-b ">
                          <Skeleton
                            width="100%"
                            height="20px"
                            styleClass="mx-auto"
                          />
                        </td>
                        <td className="py-2 px-4 border-b ">
                          <Skeleton
                            width="100%"
                            height="20px"
                            styleClass="mx-auto"
                          />
                        </td>
                        <td className="py-2 px-4 border-b ">
                          <span className="w-full">
                            <Skeleton
                              width="50%"
                              height="20px"
                              styleClass="mx-auto"
                            />
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b ">
                          <Skeleton
                            width="50%"
                            height="20px"
                            styleClass="mx-auto"
                          />
                        </td>
                        <td className="py-2 px-4 border-b ">
                          <div className="flex !space-x-1">
                            <Skeleton
                              width="80px"
                              height="30px"
                              styleClass="mx-auto"
                            />
                            <Skeleton
                              width="80px"
                              height="30px"
                              styleClass="mx-auto"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-4 border-b "></td>
                      </tr>
                    ))
                  ) : sortedRequestTypes.some(
                      (requestType) => requestType.eventDetails.length > 0
                    ) ? (
                    sortedRequestTypes.map((requestType) =>
                      requestType.eventDetails.length > 0 ? (
                        <RequestListView
                          key={`request-type-${requestType._type}`}
                          contract={contract}
                          _type={requestType._type}
                          eventDetails={requestType.eventDetails}
                        />
                      ) : null
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-2 px-4 border-b text-center"
                      >
                        No pending requests available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Add Stakeholder Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Stakeholder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Stakeholder Address (0x...)"
                value={newStakeholderAddress}
                onChange={(e) => setNewStakeholderAddress(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              {isAddConditionLoading ? (
                <LoadingButton />
              ) : (
                <Button onClick={handleAddStakeholder}>Add</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove StakeHolder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={stakeHolderToRemove}
                onValueChange={(value) => setstakeHolderToRemove(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Stakeholder to Remove" />
                </SelectTrigger>
                <SelectContent>
                  {stakeholders && stakeholders.length > 0 ? (
                    stakeholders.map((address, index) => (
                      <SelectItem key={index} value={address}>
                        {address}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No Stakeholder available
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
        <Dialog
          open={contractStateDialogOpen}
          onOpenChange={setContractStateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{contractStateContent?.title}</DialogTitle>
              <DialogDescription>
                {contractStateContent?.description}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setContractStateDialogOpen(false)}
              >
                Cancel
              </Button>
              {isContractConditionLoading ? (
                <LoadingButton />
              ) : (
                <Button onClick={() => handleContractState()}>Confirm</Button>
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

export default StakeholderView;

export interface RequestDetails {
  actionId: string;
  actionType: number;
  key: string;
  approvalCount: string;
  rejectionCount: string;
  status: number;
  hasVoted: boolean;
  userApproved: boolean;
}

const RequestListView = ({
  contract,
  _type,
  eventDetails,
}: {
  contract: any;
  _type: number;
  eventDetails: any[];
}) => {
  const currentUser = useActiveAccount();
  const [pendingRequests, setPendingRequests] = useState<any[]>();
  const [mergedRequests, setMergedRequests] = useState<any[]>([]);
  const [viewDetailsIndex, setViewDetailsIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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

  // fetch add request type = 0
  const { data, isPending } = useReadContract({
    contract,
    method:
      "function getPendingActionsByType(uint8 _type) view returns ((bytes32 actionId, uint8 actionType, string key, uint256 approvalCount, uint256 rejectionCount, uint8 status, bool hasVoted, bool userApproved)[] result)",
    params: [_type],
    from: currentUser?.address,
  });

  const requestTypeLabel = [
    "Add",
    "Remove",
    "ConditionRemove",
    "Pause",
    "Resume",
    "Cancel",
  ];

  const handleRequestFormat = useCallback((item: any): RequestDetails => {
    return {
      actionId: item.actionId,
      actionType: item.actionType,
      key: item.key,
      approvalCount: item.approvalCount.toString(),
      rejectionCount: item.rejectionCount.toString(),
      status: item.status,
      hasVoted: item.hasVoted,
      userApproved: item.userApproved,
    };
  }, []);

  const handleBatchUpdate = useCallback(
    (items: readonly any[]) => {
      const formattedRequests = items.map(handleRequestFormat);

      setPendingRequests(formattedRequests);
    },
    [handleRequestFormat]
  );

  const { mutate: sendTransaction } = useSendTransaction();

  // Handle stakeholder action voting
  const handleVote = (actionId: string, approved: boolean) => {
    const transaction: any = prepareContractCall({
      contract,
      method: "function voteOnAction(bytes32 _actionId, bool _approved)",
      params: [`0x${actionId.split("x")[1]}`, approved],
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

  const mergedRequestsMemo = useMemo(() => {
    // Create a Map for eventDetails for efficient lookup

    const eventMap = new Map<string, any>();

    if (!eventDetails) return;
    eventDetails.map((event: any) => {
      for (const key in event) {
        if (key === "transactionHash" && event.hasOwnProperty(key)) {
          const args = (event as any).args;

          eventMap.set(args.actionId, { transactionHash: event[key] });
        }
      }
    });

    // Merge pendingRequests with eventDetails based on actionId
    return pendingRequests?.map((pr) => {
      const eventArgs = eventMap.get(pr.actionId);
      return {
        ...pr,
        ...(eventArgs || {}), // Merge eventDetails if available
      };
    });
  }, [pendingRequests, eventDetails]);
  useEffect(() => {
    if (mergedRequestsMemo) setMergedRequests(mergedRequestsMemo);
  }, [mergedRequestsMemo]);

  useEffect(() => {
    if (!data) return;
    handleBatchUpdate(data);
  }, [data, handleBatchUpdate]);

  return (
    <>
      {mergedRequestsMemo &&
        mergedRequestsMemo.map((request, index) => (
          <>
            <tr key={index} className="border-t   px-4 border-b text-center">
              <td className="py-2 px-4 border-b text-center">
                {requestTypeLabel[request.actionType]}
              </td>
              <td className="py-2 text-center  ">
                {" "}
                <AddressBadge
                  address={request.key?.split("-").toString()}
                  stylesClass="ml-[150px]"
                />{" "}
              </td>
              <td className="py-2  px-4 border-b text-center ">
                {request.approvalCount}
              </td>
              <td className="py-2  px-4 border-b text-center">
                {request.rejectionCount}
              </td>
              <td className="py-2  px-4 border-b text-center">
                {request?.hasVoted === false ? (
                  <div className="space-x-2">
                    <Button onClick={() => handleVote(request.actionId, true)}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleVote(request.actionId, false)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : request?.userApproved === true ? (
                  <Badge variant="default">Approved</Badge>
                ) : (
                  <Badge variant="destructive">Rejected</Badge>
                )}
              </td>
              <td
                onClick={() => {
                  setIsOpen(!isOpen);
                  setViewDetailsIndex(index);
                }}
              >
                {isOpen ? (
                  <ChevronUp className="inline" />
                ) : (
                  <ChevronDown className="inline" />
                )}
              </td>
            </tr>
            {isOpen && index === viewDetailsIndex && (
              <StakeHolderRequestDetails
                key={index + "stakeholder"}
                requestId={request.actionId}
                transactionHash={request.transactionHash}
                contract={contract}
              />
            )}
            {toastProps && (
              <Toast
                message={toastProps.message}
                variant={toastProps.variant}
              />
            )}
          </>
        ))}
    </>
  );
};

const StakeHolderRequestDetails = ({
  requestId,
  transactionHash,
  contract,
}: {
  requestId: string;
  transactionHash: string;
  contract: any;
}) => {
  const [transactionTimestamp, setTransactionTimestamp] = useState<
    string | null
  >(null);
  const [origin, setOrigin] = useState("");
  const [approvers, setApprovers] = useState<readonly string[]>([]);
  const [rejectors, setRejectors] = useState<readonly string[]>([]);
  const [isTransactionDetailsLoading, setIsTransactionDetailsLoading] =
    useState(true);
  const fetchContractEventDetails = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const tx = await provider.getTransaction(transactionHash);

    if (tx.blockNumber) {
      const block = await provider.getBlock(tx.blockNumber);
      const timestamp = block.timestamp;
      const formattedDate = new Date(timestamp * 1000).toLocaleString();
      setTransactionTimestamp(formattedDate);
    }
    // Get the transaction origin (sender)
    const origin = await signer.getAddress();
    setOrigin(origin);
    setIsTransactionDetailsLoading(false);
  };
  const currentUser = useActiveAccount();

  const { data: voterList, isPending } = useReadContract({
    contract,
    method:
      "function getActionVotersList(bytes32 _actionId) view returns (address[] approvers, address[] rejectors)",
    params: [`0x${requestId.split("x")[1]}`],
    from: currentUser?.address,
  });

  useEffect(() => {
    fetchContractEventDetails();
  }, [transactionHash]);

  useEffect(() => {
    if (voterList) {
      setApprovers(voterList[0]);
      setRejectors(voterList[1]);
    }
  }, [voterList]);
  return (
    <tr>
      <td colSpan={6} className="py-2 px-4 border-b">
        <div className="space-y-2 p-4 bg-gray-100 dark:bg-gray-700">
          <div className="flex">
            <span className="font-semibold w-40">Condition ID:</span>
            <AddressBadge address={requestId} />
          </div>
          <div className="flex">
            <span className="font-semibold w-40">Initiator:</span>
            {!isTransactionDetailsLoading ? (
              <AddressBadge address={origin} />
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
              {isPending && (
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
              {isPending && (
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
  );
};
