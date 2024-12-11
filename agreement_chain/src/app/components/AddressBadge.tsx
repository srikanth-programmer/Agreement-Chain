// AddressBadge.tsx
import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";

interface AddressBadgeProps {
  address: string;
  stylesClass?: string;
}

const AddressBadge: React.FC<AddressBadgeProps> = ({
  address,
  stylesClass = "",
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCopied) {
      timer = setTimeout(() => {
        setIsCopied(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [isCopied]);

  return (
    <TooltipProvider>
      <Tooltip>
        <div
          className={`flex items-center space-x-2 my-auto ${stylesClass || ""}`}
        >
          <TooltipTrigger asChild>
            <Badge className="mr-2 ">
              {address?.length > 7 ? (
                <>
                  {address?.substring(0, 6)}...
                  {address?.substring(address.length - 4)}
                </>
              ) : (
                address
              )}
            </Badge>
          </TooltipTrigger>

          {address?.length > 7 && (
            <button
              onClick={handleCopy}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 focus:outline-none"
              aria-label={isCopied ? "Copied!" : "Copy Address"}
            >
              {isCopied ? (
                <Check className="w-5 h-5 mb-1 " />
              ) : (
                <Copy className="w-5 h-5 mb-1" />
              )}
            </button>
          )}
        </div>
        <TooltipContent>
          <span>{address}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AddressBadge;
