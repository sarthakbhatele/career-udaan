"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { generateCustomQuiz } from "@/actions/interview";
import CustomQuiz from "../../../_components/custom-quiz";

export default function CustomQuizClient({ suggestedTopics, limitInfo }) {
    const [selectedTopic, setSelectedTopic] = useState("");
    const [customTopic, setCustomTopic] = useState("");
    const [quizStarted, setQuizStarted] = useState(false);

    const {
        loading: generating,
        fn: generateQuizFn,
        data: quizData,
    } = useFetch(generateCustomQuiz);

    const handleStartQuiz = async () => {
        const topic = customTopic || selectedTopic;

        if (!topic) {
            toast.error("Please select or enter a topic");
            return;
        }

        await generateQuizFn(topic);
    };

    useEffect(() => {
        if (quizData && !quizData.error && !quizData.generating) {
            setQuizStarted(true);
        }
    }, [quizData]);

    if (quizStarted && quizData?.questions) {
        return (
            <div className="container mx-auto space-y-4 py-6">
                <CustomQuiz
                    initialQuizData={quizData}
                    initialRemaining={limitInfo.remaining}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto space-y-4 py-6">
            {/* <div className="mb-6">
                <h1 className="text-5xl md:text-6xl font-bold gradient-title mb-2">
                    Custom Practice Quiz
                </h1>
                <p className="text-muted-foreground">
                    Choose a topic to focus your practice session
                </p>
                
            </div> */}

            <Badge variant="outline" className="text-base">
                {limitInfo.remaining}/{limitInfo.limit} attempts remaining today
            </Badge>

            <Card>
                <CardHeader>
                    <CardTitle>Select Your Topic</CardTitle>
                    <CardDescription>
                        Pick from suggested topics or enter your own
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Suggested Topics (from your skills)</Label>
                        <div className="flex flex-wrap gap-2">
                            {suggestedTopics.map((topic) => (
                                <Badge
                                    key={topic}
                                    variant={selectedTopic === topic ? "default" : "outline"}
                                    className="cursor-pointer px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => {
                                        setSelectedTopic(topic);
                                        setCustomTopic("");
                                    }}
                                >
                                    {topic}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-topic">Or enter a custom topic</Label>
                        <Input
                            id="custom-topic"
                            placeholder="e.g., React Hooks, Data Structures, System Design"
                            value={customTopic}
                            onChange={(e) => {
                                setCustomTopic(e.target.value);
                                setSelectedTopic("");
                            }}
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleStartQuiz}
                        disabled={generating || (!selectedTopic && !customTopic) || !limitInfo.canAttempt}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating 20 Questions...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Start Custom Quiz
                            </>
                        )}
                    </Button>

                    {!limitInfo.canAttempt && (
                        <p className="text-sm text-destructive text-center">
                            Daily limit reached. Try again tomorrow.
                        </p>
                    )}
                </CardContent>
            </Card>

            {quizData?.generating && (
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">{quizData.message}</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}