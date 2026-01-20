"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { saveQuizResult } from "@/actions/interview";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { Loader2 } from "lucide-react";

export default function CustomQuiz({ initialQuizData, initialRemaining }) {
    const router = useRouter();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [remainingAttempts, setRemainingAttempts] = useState(initialRemaining);

    const {
        loading: savingResult,
        fn: saveQuizResultFn,
        data: resultData,
        setData: setResultData,
    } = useFetch(saveQuizResult);

    useEffect(() => {
        if (initialQuizData?.questions) {
            setAnswers(new Array(initialQuizData.questions.length).fill(null));
        }
    }, [initialQuizData]);

    useEffect(() => {
        if (resultData) {
            setRemainingAttempts(prev => prev > 0 ? prev - 1 : 0);
        }
    }, [resultData]);

    const handleAnswer = (answer) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = answer;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestion < initialQuizData.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            finishQuiz();
        }
    };

    const calculateScore = () => {
        let correct = 0;
        answers.forEach((answer, index) => {
            if (answer === initialQuizData.questions[index].correctAnswer) {
                correct++;
            }
        });
        return (correct / initialQuizData.questions.length) * 100;
    };

    const finishQuiz = async () => {
        const score = calculateScore();
        try {
            await saveQuizResultFn(
                initialQuizData.questions,
                answers,
                score,
                "custom",
                initialQuizData.topic
            );
            toast.success("Custom quiz completed!");
        } catch (error) {
            toast.error(error.message || "Failed to save quiz results");
        }
    };

    const quitQuiz = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to quit? Your progress will be saved with current answers."
        );

        if (!confirmed) return;

        const finalAnswers = [...answers];
        for (let i = 0; i < initialQuizData.questions.length; i++) {
            if (finalAnswers[i] === null) {
                finalAnswers[i] = null;
            }
        }

        const score = calculateScore();

        try {
            await saveQuizResultFn(
                initialQuizData.questions,
                finalAnswers,
                score,
                "custom",
                initialQuizData.topic
            );
            toast.success("Quiz saved with partial answers");
        } catch (error) {
            toast.error("Failed to save quiz");
        }
    };

    if (resultData) {
        return (
            <div className="mx-2">
                {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="text-sm text-muted-foreground mb-4">
                        Custom quizzes remaining today: {remainingAttempts}/10
                    </p>
                )}
                <QuizResult
                    result={resultData}
                    onStartNew={() => {
                        setResultData(null);
                        setCurrentQuestion(0);
                        setAnswers([]);
                    }}
                />
            </div>
        );
    }

    if (!initialQuizData?.questions) {
        return null;
    }

    const question = initialQuizData.questions[currentQuestion];

    return (
        <div className="mx-2">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold gradient-title">
                        {initialQuizData.topic}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Custom Practice Quiz • 20 Questions
                    </p>
                </div>
                {remainingAttempts !== null && (
                    <p className="text-sm text-muted-foreground">
                        Remaining today: {remainingAttempts}/10
                    </p>
                )}
            </div>

            <Card
                onContextMenu={(e) => e.preventDefault()}
                style={{ userSelect: 'none' }}
            >
                <CardHeader>
                    <CardTitle>
                        Question {currentQuestion + 1} of {initialQuizData.questions.length}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {question.question.includes('```') || question.question.includes('javascript') ? (
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{question.question}</code>
                            </pre>
                        ) : (
                            <p className="text-lg font-medium whitespace-pre-wrap">{question.question}</p>
                        )}
                    </div>
                    <RadioGroup
                        onValueChange={handleAnswer}
                        value={answers[currentQuestion]}
                        className="space-y-2"
                    >
                        {question.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`}>{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        onClick={() => setCurrentQuestion(currentQuestion - 1)}
                        variant="outline"
                        disabled={currentQuestion === 0}
                    >
                        Previous
                    </Button>

                    <Button
                        onClick={quitQuiz}
                        variant="destructive"
                        disabled={savingResult}
                    >
                        Quit Quiz
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={!answers[currentQuestion] || savingResult}
                        className="ml-auto"
                    >
                        {savingResult ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving Results...
                            </>
                        ) : (
                            currentQuestion < initialQuizData.questions.length - 1 ? "Next Question" : "Finish Quiz"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}