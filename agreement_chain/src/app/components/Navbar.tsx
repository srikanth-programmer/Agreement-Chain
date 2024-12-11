"use client";
"use client";
import { client } from "@/app/client";
import Link from "next/link";
import {
  ConnectButton,
  darkTheme,
  lightTheme,
  useActiveAccount,
} from "thirdweb/react";

import { useTheme } from "../providers/ThemeProvider";
import { Moon, Sun, User } from "lucide-react";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const account = useActiveAccount();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background dark:bg-dark-background  border-gray-200 dark:border-gray-600 shadow-[0px_4px_6px_rgba(0,0,0,0.1)] dark:shadow-[0px_4px_6px_rgba(0,0,0,0.5)]">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src="/agreement-chain-logo.svg"
              alt="AgreementChain"
              className="h-16 w-16"
            />
            <Link href="/">
              <span className="font-semibold text-xl text-primary dark:text-dark-primary">
                AgreementChain
              </span>
            </Link>

            {account?.address && (
              <Link href={`/dashboard/${account?.address}`}>
                <span className="font-normal ml-8 text-primary dark:text-dark-primary">
                  Dashboard
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-background-secondary dark:hover:bg-dark-background-secondary transition-colors"
            >
              {theme === "light" ? (
                <Moon
                  size={20}
                  className="text-primary dark:text-dark-primary border-none outline-none"
                />
              ) : (
                <Sun
                  size={20}
                  className="text-primary dark:text-dark-primary border-none outline-none"
                />
              )}
            </button>

            <ConnectButton
              client={client}
              theme={theme == "light" ? lightTheme() : darkTheme()}
              detailsButton={{
                style: {
                  maxHeight: "40px",

                  color: "text-primary dark:text-dark-primary",
                },
              }}
            />

            <button className="p-2 rounded-full hover:bg-background-secondary dark:hover:bg-dark-background-secondary">
              <User className="text-primary dark:text-dark-primary" size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

// className="text-primary dark:text-dark-primary"
