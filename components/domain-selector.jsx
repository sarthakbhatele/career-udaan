"use client"

import { switchActiveDomain } from "@/actions/user";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react"
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

export function DomainSelector({ domains, activeDomainId, plan, domainLimit }) {

    const router = useRouter();
    const [isPending, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(false)

    const activeDomain = domains.find((d) => d.id === activeDomainId)
    const canAddMore = domains.length < domainLimit

    const handleSwitch = async (domainId) => {
        if (domainId === activeDomainId) {
            setIsOpen(false)
            return
        }

        startTransition(async () => {
            try {
                await switchActiveDomain(domainId)
                toast.success("Domain switched successfully!")
                setIsOpen(false)
                router.refresh()
            } catch (error) {
                toast.error(error.message || "Failed to switch domain")
            }
        })
    }

    const handleAddNew = () => {
        if (canAddMore) {
            router.push("/onboarding")
        } else {
            toast.error(
                plan === "FREE"
                    ? "Free plan allows 1 domain only. Upgrade to PRO to add more."
                    : `You've reached the maximum of ${domainLimit} domains.`
            )
        }
    }

    if (!activeDomain) return null

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-[200px] justify-between"
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <span className="truncate">{formatDomainName(activeDomain.industry)}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[200px]" align="end">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Your Domains</span>
                    <Badge variant="secondary" className="text-xs">
                        {domains.length}/{domainLimit}
                    </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {domains.map((domain) => (
                    <DropdownMenuItem
                        key={domain.id}
                        onSelect={() => handleSwitch(domain.id)}
                        className="cursor-pointer"
                    >
                        <Check
                            className={cn(
                                "mr-2 h-4 w-4",
                                activeDomainId === domain.id ? "opacity-100" : "opacity-0"
                            )}
                        />
                        <span className="truncate">{formatDomainName(domain.industry)}</span>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={handleAddNew} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Domain
                </DropdownMenuItem>
            </DropdownMenuContent>

        </DropdownMenu>
    )
}

function formatDomainName(industry) {
    // Convert "tech-software-development" to "Tech - Software Development"
    const parts = industry.split("-");
    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" - ");
}