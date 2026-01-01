export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                </div>
                <p className="text-muted-foreground animate-pulse">Loading Career Udaan...</p>
            </div>
        </div>
    )
}