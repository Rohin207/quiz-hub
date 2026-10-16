
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Circle, AlertCircle, Flag, BarChart3, Target, Brain } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuestionRenderer } from './QuestionRenderer';
import { TestSidebar } from './TestSidebar';
import { TestSubmissionDialog } from './TestSubmissionDialog';

interface Question {
  id: string;
  type: 'mcq' | 'multi-correct' | 'matrix-match' | 'numerical' | 'subjective';
  section: string;
  question: string;
  options?: string[];
  matrix?: { left: string[]; right: string[] };
  answer?: any;
  marks: number;
}

interface TestTakingPanelProps {
  testId: string;
  testTitle: string;
  duration: number; // in minutes
  questions: Question[];
  onTestSubmit: (answers: Record<string, any>) => void;
  onExit: () => void;
}

export const TestTakingPanel = ({ 
  testId, 
  testTitle, 
  duration, 
  questions, 
  onTestSubmit, 
  onExit 
}: TestTakingPanelProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(duration * 60); // Convert to seconds
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Prevent page refresh/navigation during test
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F5, Ctrl+R, Alt+F4, etc.
      if (e.key === 'F5' || 
          (e.ctrlKey && e.key === 'r') || 
          (e.altKey && e.key === 'F4') ||
          (e.ctrlKey && e.key === 'w')) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAnswerChange = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  const handleAutoSubmit = () => {
    toast({
      title: "Time's up!",
      description: "Your test has been automatically submitted.",
      variant: "destructive",
    });
    onTestSubmit(answers);
  };

  const handleManualSubmit = () => {
    setShowSubmissionDialog(true);
  };

  const confirmSubmit = () => {
    onTestSubmit(answers);
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionId: string) => {
    if (answers[questionId] !== undefined) return 'answered';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    return 'not-attempted';
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isMobile = useIsMobile();
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestions.size;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      {isMobile && (
        <div className="bg-primary text-primary-foreground p-3 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{testTitle}</h1>
              <div className="flex items-center space-x-2 text-sm opacity-90">
                <span>Q{currentQuestionIndex + 1}/{questions.length}</span>
                <span>•</span>
                <span>{currentQuestion.marks}M</span>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.section}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className={`text-sm font-mono ${timeLeft < 300 ? 'text-destructive-foreground' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleManualSubmit}
                className="text-xs px-2"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Test Area - Now on the LEFT */}
      <div className="flex-1 flex flex-col min-h-0 order-1 lg:order-1">
        {/* Desktop Header */}
        {!isMobile && (
          <div className="bg-primary text-primary-foreground p-4 border-b border-border">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold">{testTitle}</h1>
                <div className="flex items-center space-x-4 text-sm opacity-90 mt-1">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>•</span>
                  <span>Section: {currentQuestion.section}</span>
                  <span>•</span>
                  <span>Type: {currentQuestion.type.toUpperCase()}</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span className={`text-lg font-mono ${timeLeft < 300 ? 'text-destructive-foreground' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={handleManualSubmit}
                >
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Test Statistics Bar */}
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Test Stats</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">Answered:</span>
                  <span className="font-medium">{answeredCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Circle className="h-3 w-3 text-gray-400" />
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-medium">{unansweredCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Flag className="h-3 w-3 text-orange-500" />
                  <span className="text-muted-foreground">Flagged:</span>
                  <span className="font-medium">{flaggedCount}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Completion:</span>
              <span className="font-medium text-sm">{Math.round((answeredCount / questions.length) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-6">
          <div className="w-full max-w-4xl mx-auto">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">
                        Question {currentQuestionIndex + 1}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {currentQuestion.section}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {currentQuestion.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                      </Badge>
                      <Badge 
                        variant={answers[currentQuestion.id] !== undefined ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {answers[currentQuestion.id] !== undefined ? 'Answered' : 'Not Attempted'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={flaggedQuestions.has(currentQuestion.id) 
                      ? 'border-orange-500 text-orange-600 bg-orange-50' 
                      : ''
                    }
                  >
                    <Flag className="h-4 w-4 mr-1" />
                    {flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag for Review'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <QuestionRenderer
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]}
                  onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-card border-t border-border p-3 lg:p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              size={isMobile ? "sm" : "default"}
            >
              Previous
            </Button>
            
            {/* Mobile: Show question navigation */}
            {isMobile && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 5))}
                  disabled={currentQuestionIndex < 5}
                  className="text-xs px-2"
                >
                  -5
                </Button>
                <span className="text-sm font-medium px-2">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 5))}
                  disabled={currentQuestionIndex >= questions.length - 5}
                  className="text-xs px-2"
                >
                  +5
                </Button>
              </div>
            )}

            {/* Desktop: Show legend */}
            {!isMobile && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Circle className="h-3 w-3 text-gray-400" />
                  <span>Not Attempted</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Flag className="h-3 w-3 text-orange-500" />
                  <span>Flagged</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              size={isMobile ? "sm" : "default"}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Test Sidebar - Now on the RIGHT side */}
      {!isMobile && (
        <div className="order-2 lg:order-2">
          <TestSidebar
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            flaggedQuestions={flaggedQuestions}
            onQuestionSelect={setCurrentQuestionIndex}
            testTitle={testTitle}
          />
        </div>
      )}

      {/* Submission Dialog */}
      <TestSubmissionDialog
        open={showSubmissionDialog}
        onOpenChange={setShowSubmissionDialog}
        onConfirm={confirmSubmit}
        totalQuestions={questions.length}
        answeredQuestions={Object.keys(answers).length}
        timeLeft={timeLeft}
      />
    </div>
  );
};
