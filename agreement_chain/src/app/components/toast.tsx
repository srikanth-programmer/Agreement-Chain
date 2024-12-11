"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils"; // Utility for conditional classNames

import { X } from "lucide-react";
interface ToastProps {
  message: string;
  variant: "success" | "failure";
}

const Toast: React.FC<ToastProps> = ({ message, variant }) => {
  const [open, setOpen] = React.useState(true);

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      <ToastPrimitive.Root
        open={open}
        onOpenChange={setOpen}
        duration={5000}
        className={cn(
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-4 py-3 shadow-lg flex items-center space-x-3",
          variant === "success"
            ? "ring-2 ring-green-500"
            : "ring-2 ring-red-500"
        )}
      >
        {variant === "success" ? (
          <CheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
        )}
        <ToastPrimitive.Title className="font-medium text-gray-900 dark:text-gray-100 flex-1">
          {message}
        </ToastPrimitive.Title>
        <ToastPrimitive.Close
          className="flex items-center justify-center w-5 h-5 text-gray-500 hover:text-red-500 dark:text-gray-400"
          aria-label="Close"
        >
          <X size={16} />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>

      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-96 max-w-full m-0 list-none z-50 outline-none" />
    </ToastPrimitive.Provider>
  );
};

export default Toast;
