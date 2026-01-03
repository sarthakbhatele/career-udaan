"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { switchActiveDomain, deleteDomain } from "@/actions/user";
import { toast } from "sonner";

export default function DomainList({ domains, activeDomainId, plan }) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(null);

    const handleSwitch = async (domainId) => {
        if (domainId === activeDomainId) return;

        try {
            await switchActiveDomain(domainId);
            toast.success("Domain switched successfully!");
            router.refresh();
        } catch (error) {
            toast.error(error.message || "Failed to switch domain");
        }
    };

    const handleDelete = async (domainId) => {
        setDeleting(domainId);
        try {
            await deleteDomain(domainId);
            toast.success("Domain deleted successfully!");
            router.refresh();
        } catch (error) {
            toast.error(error.message || "Failed to delete domain");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {domains.map((domain) => {
                const isActive = domain.id === activeDomainId;
                const canDelete = domains.length > 1 && !isActive;

                return (
                    <Card
                        key={domain.id}
                        className={`relative ${isActive ? "border-primary shadow-lg" : ""}`}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <CardTitle className="text-lg gradient-title">
                                    {formatDomainName(domain.industry)}
                                </CardTitle>
                                {isActive && (
                                    <BadgeUI className="bg-primary">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Active
                                    </BadgeUI>
                                )}
                            </div>
                            <CardDescription>
                                Created {format(new Date(domain.createdAt), "MMM dd, yyyy")}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {domain.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {domain.bio}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {domain.skills?.slice(0, 3).map((skill, idx) => (
                                    <BadgeUI key={idx} variant="secondary" className="text-xs">
                                        {skill}
                                    </BadgeUI>
                                ))}
                                {domain.skills?.length > 3 && (
                                    <BadgeUI variant="outline" className="text-xs">
                                        +{domain.skills.length - 3} more
                                    </BadgeUI>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                {!isActive && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSwitch(domain.id)}
                                        className="flex-1"
                                    >
                                        Switch to This
                                    </Button>
                                )}

                                {canDelete && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={deleting === domain.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Domain?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete this domain and all
                                                    associated data (quizzes, assessments). This action
                                                    cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(domain.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function formatDomainName(industry) {
    const parts = industry.split("-");
    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" - ");
}