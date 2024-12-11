"use client";
import {
  useActiveAccount,
  useConnect,
  useProfiles,
  useReadContract,
} from "thirdweb/react";

import { useRouter } from "next/navigation";

export default function Home() {
  const address = useActiveAccount();

  const router = useRouter();

  const handleGetStarted = async () => {
    if (address) {
      router.push(`/dashboard/${address?.address}`);
    } else {
      useConnect();
    }
  };

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/5 dark:to-secondary/5" />

        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Left content */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
                Secure Your Agreements
                <span className="text-primary dark:text-primary-light block mt-2">
                  on the Blockchain
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
                Create, manage, and secure stakeholder agreements with
                blockchain technology. Experience transparency and trust like
                never before.
              </p>

              <button
                onClick={handleGetStarted}
                className="px-8 py-4 cursor-pointer rounded-lg p-2 bg-primary text-primary-foreground hover:bg-background-secondary dark:hover:bg-dark-background-secondary transition-colors ext-lg font-medium flex items-center justify-center space-x-2 mx-auto md:mx-0"
              >
                <span>Get Started</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Right image */}
            <div className="flex-1">
              <div className="relative w-full max-w-lg mx-auto">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 dark:bg-[#3b82f6]/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-90 dark:opacity-70 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/30 dark:bg-[#60a5fa]/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-90 dark:opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-success/30 dark:bg-[#93c5fd]/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-90 dark:opacity-70 animate-blob animation-delay-4000" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose AgreementChain?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Secure & Immutable",
                description:
                  "All agreements are stored on the blockchain, ensuring they cannot be tampered with.",
                icon: "🔒",
              },
              {
                title: "Transparent",
                description:
                  "Track and verify all stakeholder interactions with complete transparency.",
                icon: "👀",
              },
              {
                title: "Easy to Use",
                description:
                  "User-friendly interface that makes blockchain technology accessible to everyone.",
                icon: "✨",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
