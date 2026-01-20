// import React from "react";
// import { Button } from "./ui/button";
// import Link from "next/link";
// import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
// import Image from "next/image";
// import { checkUser } from "@/lib/checkUser";
// import { HeaderNav } from "./header-nav";

// export default async function Header() {
//   await checkUser();

//   return (
//     <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
//       <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
//         <Link href="/">
//           <Image
//             src={"/logo3.png"}
//             alt="Career Udaan Logo"
//             width={280}
//             height={60}
//             className="h-12 sm:h-14 md:h-16 py-1 w-auto object-contain animate-glow"
//           />
//         </Link>

//         {/* Action Buttons */}
//         <div className="flex items-center space-x-2 md:space-x-4">
//           <SignedIn>
//             <HeaderNav />
//           </SignedIn>

//           <SignedOut>
//             <SignInButton>
//               <Button variant="outline">Sign In</Button>
//             </SignInButton>
//           </SignedOut>

//           <SignedIn>
//             <UserButton
//               appearance={{
//                 elements: {
//                   avatarBox: "w-10 h-10",
//                   userButtonPopoverCard: "shadow-xl",
//                   userPreviewMainIdentifier: "font-semibold",
//                 },
//               }}
//               signOutFallbackRedirectUrl="/"
//             />
//           </SignedIn>

//         </div>
//       </nav>
//     </header>
//   );
// }


// v3
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import { checkUser } from "@/lib/checkUser";
import { HeaderNav } from "./header-nav";
import { DomainSelector } from "./domain-selector";
import { getUserDomains } from "@/actions/user";

export default async function Header() {
  await checkUser();

  let domainsData = null;
  try {
    domainsData = await getUserDomains();
  } catch (error) {
    console.error("Failed to fetch domains:", error);
  }

  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto px-2 sm:px-4 h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex-shrink-0">
          <Image
            src={"/logo3.png"}
            alt="Career Udaan Logo"
            width={200}
            height={45}
            className="h-10 sm:h-12 md:h-14 w-auto object-contain animate-glow"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
          <SignedIn>
            {/* Domain Selector - hide on small screens */}
            {domainsData && domainsData.domains.length > 0 && (
              <div className="hidden md:block">
                <DomainSelector
                  domains={domainsData.domains}
                  activeDomainId={domainsData.activeDomainId}
                  plan={domainsData.plan}
                  domainLimit={domainsData.domainLimit}
                />
              </div>
            )}

            <HeaderNav />
          </SignedIn>

          <SignedOut>
            <SignInButton>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 sm:w-10 sm:h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
              signOutFallbackRedirectUrl="/"
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}