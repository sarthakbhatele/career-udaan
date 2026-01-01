import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ResumeLoading() {
    return (
        <div className="container mx-auto py-6 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-12 w-64" />
                <div className="space-x-2 flex">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}