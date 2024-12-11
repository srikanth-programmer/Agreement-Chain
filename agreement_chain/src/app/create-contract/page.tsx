"use client";

import React, { useState } from "react";
import { X, Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { AGREEMENT_FACTORY } from "../constants/contract";
import { sepolia } from "thirdweb/chains";
import { client } from "../client";
import Toast from "../components/toast";

interface FormData {
  title: string;
  description: string;
  stakeholders: string[];
  amount: string;
  country: string;
  customFieldNames: string[];
  customFieldValues: string[];
}

const DynamicForm = () => {
  const initialFormData: FormData = {
    title: "",
    description: "",
    stakeholders: [],
    amount: "",
    country: "",
    customFieldNames: [],
    customFieldValues: [],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [stakeholderInput, setStakeholderInput] = useState("");
  const [customFieldNameInput, setCustomFieldNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(false);
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

  const handleStakeholderKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      (e.key === "Enter" || e.key === "," || e.key === " ") &&
      stakeholderInput.trim()
    ) {
      e.preventDefault();
      addStakeholders(stakeholderInput.trim());
    }
  };
  // Handle paste event for stakeholders
  const handleStakeholderPaste = (
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const pastedStakeholders = paste
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (pastedStakeholders.length > 0) {
      addStakeholders(...pastedStakeholders);
    }
  };
  // Add multiple stakeholders
  const addStakeholders = (...stakeholders: string[]) => {
    setFormData((prev: FormData) => ({
      ...prev,
      stakeholders: [...prev.stakeholders, ...stakeholders],
    }));
    setStakeholderInput("");
  };

  // Remove a stakeholder by index
  const removeStakeholder = (index: number) => {
    setFormData((prev: FormData) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((_, i) => i !== index),
    }));
  };

  // Add a new custom field (both name and value)
  const addCustomField = () => {
    if (customFieldNameInput.trim()) {
      setFormData((prev: FormData) => ({
        ...prev,
        customFieldNames: [
          ...prev.customFieldNames,
          customFieldNameInput.trim(),
        ],
        customFieldValues: [...prev.customFieldValues, ""],
      }));
      setCustomFieldNameInput("");
    }
  };

  // Remove a custom field by index
  const removeCustomField = (index: number) => {
    setFormData((prev: FormData) => ({
      ...prev,
      customFieldNames: prev.customFieldNames.filter((_, i) => i !== index),
      customFieldValues: prev.customFieldValues.filter((_, i) => i !== index),
    }));
  };

  // Handle changes to custom field names
  const handleCustomFieldNameChange = (index: number, value: string) => {
    const updatedNames = [...formData.customFieldNames];
    updatedNames[index] = value;
    setFormData((prev) => ({
      ...prev,
      customFieldNames: updatedNames,
    }));
  };

  // Handle changes to custom field values
  const handleCustomFieldValueChange = (index: number, value: string) => {
    const updatedValues = [...formData.customFieldValues];
    updatedValues[index] = value;
    setFormData((prev) => ({
      ...prev,
      customFieldValues: updatedValues,
    }));
  };
  const { mutate: sendTransaction } = useSendTransaction();

  const contract = getContract({
    address: AGREEMENT_FACTORY,
    chain: sepolia,
    client,
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Basic validation (optional)
    if (
      !formData.title ||
      !formData.description ||
      !formData.stakeholders ||
      !formData.country
    ) {
      showFailureToast("Please fill in all required fields.");

      return;
    }
    if (
      !(formData.customFieldNames?.length == formData.customFieldValues?.length)
    ) {
      showFailureToast("Please fill out Condition Values");
      return;
    }

    setIsSubmitting(true);

    const submissionData = {
      title: formData.title,
      description: formData.description,
      stakeholders: formData.stakeholders,
      amount: formData.amount,
      country: formData.country,
      conditionKeys: formData.customFieldNames,
      conditionValues: formData.customFieldValues,
    };
    if (formData.amount) {
      submissionData.conditionKeys.push("Contract Worth");
      submissionData.conditionValues.push(formData.amount);
    }

    submissionData.conditionKeys.push("Country");
    submissionData.conditionValues.push(formData.country);

    const transaction = prepareContractCall({
      contract,
      method:
        "function createAgreement(string _title, string _description, address[] _stakeholders, string[] conditionKeys, string[] conditionValues) returns (address agreement)",
      params: [
        submissionData.title,
        submissionData.description,
        submissionData.stakeholders,
        submissionData.conditionKeys,
        submissionData.conditionValues,
      ],
    });
    setIsSubmissionLoading(true);
    sendTransaction(transaction, {
      onSuccess: () => {
        showSuccessToast("Contract created successfully.");
        setIsSubmissionLoading(false);
        setFormData(initialFormData);
        setIsSubmitting(false);
        // router.push(`/dashboard/${useActiveAccount()?.address}`);
      },
      onError: (error: any) => {
        setIsSubmissionLoading(false);

        setIsSubmitting(false);

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

  return (
    <div className="container mx-auto px-4 top-8 mt-10">
      <div className="flex flex-col md:flex-row space-x-4">
        <div className="w-full md:w-1/2 flex justify-center items-center mb-8 md:mb-0">
          <img
            src="/3.png"
            alt="form"
            width={200}
            height={200}
            className="w-full rounded-lg"
          />
        </div>

        <div className="w-full md:w-1/2">
          <Card className="w-full border border-gray-200 dark:border-gray-600 shadow-sm">
            <CardHeader className="border-b border-gray-200 dark:border-gray-600">
              <CardTitle>Create New Contract</CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="title">
                    Title
                  </label>
                  <Input
                    id="title"
                    className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:outline-none"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="description">
                    Description
                  </label>
                  <Input
                    id="description"
                    className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter description"
                    required
                  />
                </div>

                {/* Stakeholders */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stakeholders</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.stakeholders.map((stakeholder, index) => (
                      <Badge key={index} variant="default">
                        <span
                          className="flex items-center gap-1"
                          // className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center gap-2 border border-gray-200 dark:border-gray-600"
                        >
                          {stakeholder?.substring(0, 6)}...
                          {stakeholder?.substring(stakeholder.length - 4)}
                          <button
                            type="button"
                            onClick={() => removeStakeholder(index)}
                            className="text-gray-500 hover:text-red-500 dark:text-gray-400"
                            aria-label={`Remove stakeholder ${stakeholder}`}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    value={stakeholderInput}
                    onChange={(e) => setStakeholderInput(e.target.value)}
                    onKeyDown={handleStakeholderKeyDown}
                    placeholder="Type and press Enter, comma, or space to add"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="amount">
                    Contract Worth
                  </label>
                  <Input
                    id="amount"
                    type="text"
                    className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                  />
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="country">
                    Country
                  </label>
                  <Input
                    id="country"
                    className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    placeholder="Enter country"
                    required
                  />
                </div>

                {/* Custom Fields */}
                <div className="space-y-4">
                  {/* Add Custom Field */}
                  <div className="flex items-center gap-2">
                    <Input
                      className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                      value={customFieldNameInput}
                      onChange={(e) => setCustomFieldNameInput(e.target.value)}
                      placeholder="Enter condition name"
                      aria-label="Condition Name"
                    />
                    <Button
                      type="button"
                      onClick={addCustomField}
                      variant="outline"
                      size="icon"
                      className="border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Add Condition"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>

                  {/* Render Custom Fields */}
                  {formData.customFieldNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {/* Condition Name */}
                      <Input
                        className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        value={formData.customFieldNames[index]}
                        onChange={(e) =>
                          handleCustomFieldNameChange(index, e.target.value)
                        }
                        placeholder="Condition Name"
                        required
                        aria-label={`Condition Name ${index + 1}`}
                      />

                      {/* Condition Value */}
                      <Input
                        className="border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                        value={formData.customFieldValues[index]}
                        onChange={(e) =>
                          handleCustomFieldValueChange(index, e.target.value)
                        }
                        placeholder="Condition Value"
                        required
                        aria-label={`Condition Value ${index + 1}`}
                      />

                      {/* Remove Custom Field */}
                      <Button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        variant="outline"
                        size="icon"
                        className="border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        aria-label={`Remove condition ${name}`}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </form>
            </CardContent>
            {toastProps && (
              <Toast
                message={toastProps.message}
                variant={toastProps.variant}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DynamicForm;
