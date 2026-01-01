"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Loader2, LayoutDashboard, FileText, PenBox, GraduationCap } from "lucide-react";
import { Button } from "./ui/button";
import { Button as MovingBorderButton } from "./ui/moving-border";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, StarsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeaderNav() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingRoute, setPendingRoute] = useState(null);

    const handleNavigation = (path) => {
        setPendingRoute(path);
        startTransition(() => {
            router.push(path);
        });
    };

    return (
        <div className="flex items-center space-x-2 md:space-x-4">
            <MovingBorderButton
                onClick={() => handleNavigation("/dashboard")}
                disabled={isPending && pendingRoute === "/dashboard"}
                borderRadius="0.75rem"
                duration={4000}
                containerClassName={cn(
                    "inline-flex h-10 w-10 md:w-auto",
                    isPending && pendingRoute === "/dashboard" && "opacity-50 cursor-wait"
                )}
                className="bg-black border-slate-700/30 px-0 md:px-4 gap-2 justify-center"
                borderClassName="bg-[radial-gradient(#c5c7cc_40%,transparent_60%)]"
            >
                {isPending && pendingRoute === "/dashboard" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <LayoutDashboard className="h-4 w-4" />
                )}
                <span className="hidden md:inline">Industry Insights</span>
            </MovingBorderButton>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="flex items-center gap-2 md:gap-2 h-9 w-10 md:w-auto md:px-4 p-0 md:p-2 rounded-xl">
                        <StarsIcon className="h-4 w-4 hidden md:block" />
                        <span className="hidden md:block">Growth Tools</span>
                        <ChevronDown className="h-4 w-4 md:ml-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={() => handleNavigation("/resume")}
                        disabled={isPending}
                        className="cursor-pointer"
                    >
                        {isPending && pendingRoute === "/resume" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                        Build Resume
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleNavigation("/ai-cover-letter")}
                        disabled={isPending}
                        className="cursor-pointer"
                    >
                        {isPending && pendingRoute === "/ai-cover-letter" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <PenBox className="h-4 w-4" />
                        )}
                        Cover Letter
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handleNavigation("/interview")}
                        disabled={isPending}
                        className="cursor-pointer"
                    >
                        {isPending && pendingRoute === "/interview" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <GraduationCap className="h-4 w-4" />
                        )}
                        Interview Prep
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}