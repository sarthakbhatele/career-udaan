import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function InterviewLoading() {
    return (
        <div className="px-5">
            <div className="flex items-center justify-between mb-5">
                <Skeleton className="h-12 w-72" />
            </div>

            <div className="space-y-6">
                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Chart */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>

                {/* Quiz List */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}