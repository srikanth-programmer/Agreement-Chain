"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import StakeholderView from "./stakeHolder";
import ConditionView from "./conditions/ConditionView";

const ContractView = ({ address }: { address: string }) => {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <div className="container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Contract Info</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholder Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ConditionView address={address} />
        </TabsContent>

        <TabsContent value="stakeholders">
          <StakeholderView address={address} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractView;
