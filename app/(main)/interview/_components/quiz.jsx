// quiz.jsx
"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { generateQuiz, saveQuizResult } from "@/actions/interview";
import QuizResult from "./quiz-result";
import useFetch from "@/hooks/use-fetch";
import { Loader2 } from "lucide-react";

export default function Quiz({ initialRemaining, quizType = "standard" }) {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [remainingAttempts, setRemainingAttempts] = useState(initialRemaining);

  const {
    loading: generatingQuiz,
    fn: generateQuizFn,
    data: quizData,
  } = useFetch(generateQuiz);

  const {
    loading: savingResult,
    fn: saveQuizResultFn,
    data: resultData,
    setData: setResultData,
  } = useFetch(saveQuizResult);

  // Handle new response shape
  useEffect(() => {
    if (quizData?.remaining !== undefined) {
      setRemainingAttempts(quizData.remaining);
    }

    if (Array.isArray(quizData?.questions)) {
      setAnswers(new Array(quizData.questions.length).fill(null));
    }
  }, [quizData]);

  // Update remaining count when quiz result is saved
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
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === quizData.questions[index].correctAnswer) {
        correct++;
      }
    });
    return (correct / quizData.questions.length) * 100;
  };

  // const finishQuiz = async () => {
  //   const score = calculateScore();
  //   try {
  //     await saveQuizResultFn(quizData.questions, answers, score);
  //     toast.success("Quiz completed!");
  //   } catch (error) {
  //     toast.error(error.message || "Failed to save quiz results");
  //   }
  // };

  const finishQuiz = async () => {
    const score = calculateScore();
    try {
      await saveQuizResultFn(quizData.questions, answers, score, quizType);
      toast.success("Quiz completed!");
    } catch (error) {
      toast.error(error.message || "Failed to save quiz results");
    }
  };

  // const quitQuiz = async () => {
  //   // Confirmation dialog
  //   const confirmed = window.confirm(
  //     "Are you sure you want to quit? Your progress will be saved with current answers."
  //   );

  //   if (!confirmed) return;

  //   // Fill remaining unanswered questions with null
  //   const finalAnswers = [...answers];
  //   for (let i = 0; i < quizData.questions.length; i++) {
  //     if (finalAnswers[i] === null) {
  //       finalAnswers[i] = null; // Keep null for unanswered
  //     }
  //   }

  //   const score = calculateScore(); // Calculate based on answered questions

  //   try {
  //     await saveQuizResultFn(quizData.questions, finalAnswers, score);
  //     toast.success("Quiz saved with partial answers");
  //   } catch (error) {
  //     toast.error("Failed to save quiz");
  //   }
  // };

  
  // Update quitQuiz to pass quizType
  const quitQuiz = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to quit? Your progress will be saved with current answers."
    );

    if (!confirmed) return;

    const finalAnswers = [...answers];
    for (let i = 0; i < quizData.questions.length; i++) {
      if (finalAnswers[i] === null) {
        finalAnswers[i] = null;
      }
    }

    const score = calculateScore();

    try {
      await saveQuizResultFn(quizData.questions, finalAnswers, score, quizType);
      toast.success("Quiz saved with partial answers");
    } catch (error) {
      toast.error("Failed to save quiz");
    }
  };

  const startNewQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setResultData(null);
  };

  // Handle "generating" state
  if (quizData?.generating) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Generating Your Quiz...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{quizData.message}</p>
            {remainingAttempts !== null && (
              <p className="text-sm text-muted-foreground">
                Quizzes remaining today: {remainingAttempts}/10
              </p>
            )}
            <Button
              onClick={() => {
                generateQuizFn("medium");
                router.refresh();
              }}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show results if quiz is completed
  if (resultData) {
    return (
      <div className="mx-2">
        {remainingAttempts !== null && remainingAttempts > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Quizzes remaining today: {remainingAttempts}/10
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

  // Start screen
  if (!quizData || !quizData.questions) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Ready to test your knowledge?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This quiz contains 10 questions specific to your industry and skills.
          </p>
          {remainingAttempts !== null && (
            <p className="text-sm text-muted-foreground mt-2">
              Quizzes remaining today: {remainingAttempts}/10
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => generateQuizFn("medium")}
            className="w-full"
            disabled={generatingQuiz}
          >
            {generatingQuiz ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              "Start Quiz"
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Show daily limit error
  if (quizData?.error) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Daily Limit Reached</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{quizData.message}</p>
          <p className="text-sm mt-2">Attempts today: {quizData.attemptsToday}/10</p>
        </CardContent>
      </Card>
    );
  }

  const question = quizData.questions[currentQuestion];

  return (
    <Card
      className="mx-2"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      <CardHeader>
        <CardTitle>
          Question {currentQuestion + 1} of {quizData.questions.length}
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
            currentQuestion < quizData.questions.length - 1 ? "Next Question" : "Finish Quiz"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}