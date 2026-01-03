import { getUserDomains } from "@/actions/user";
import { redirect } from "next/navigation";
import DomainList from "./_components/domain-list";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DomainsPage() {
    const domainsData = await getUserDomains();

    if (!domainsData || domainsData.domains.length === 0) {
        redirect("/onboarding");
    }

    const canAddMore = domainsData.domains.length < domainsData.domainLimit;

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-4xl md:text-6xl font-bold gradient-title">
                        My Domains
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your career domains and switch between them
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                        {domainsData.plan} Plan
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                        {domainsData.domains.length}/{domainsData.domainLimit} Domains
                    </Badge>

                    {canAddMore ? (
                        <Link href="/onboarding">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Domain
                            </Button>
                        </Link>
                    ) : (
                        <Button disabled>
                            <Plus className="h-4 w-4 mr-2" />
                            Limit Reached
                        </Button>
                    )}
                </div>
            </div>

            <DomainList
                domains={domainsData.domains}
                activeDomainId={domainsData.activeDomainId}
                plan={domainsData.plan}
            />

            {!canAddMore && domainsData.plan === "FREE" && (
                <div className="mt-6 p-6 border-2 border-primary/20 rounded-lg bg-primary/5">
                    <h3 className="text-lg font-semibold mb-2">
                        Want to add more domains?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        Upgrade to PRO to manage up to 3 different career domains
                    </p>
                    <Button>Upgrade to PRO</Button>
                </div>
            )}
        </div>
    );
}