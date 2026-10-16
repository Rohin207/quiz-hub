
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Flag, BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Question {
  id: string;
  type: string;
  section: string;
  question: string;
  marks: number;
}

interface TestSidebarProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, any>;
  flaggedQuestions: Set<string>;
  onQuestionSelect: (index: number) => void;
  testTitle: string;
}

export const TestSidebar = ({
  questions,
  currentQuestionIndex,
  answers,
  flaggedQuestions,
  onQuestionSelect,
  testTitle
}: TestSidebarProps) => {
  const getQuestionStatus = (question: Question) => {
    if (answers[question.id] !== undefined) return 'answered';
    if (flaggedQuestions.has(question.id)) return 'flagged';
    return 'not-attempted';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'answered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'flagged':
        return <Flag className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (isCurrent) return 'bg-blue-100 border-blue-300';
    switch (status) {
      case 'answered':
        return 'bg-green-50 border-green-200';
      case 'flagged':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Group questions by section
  const sections = questions.reduce((acc, question, index) => {
    if (!acc[question.section]) {
      acc[question.section] = [];
    }
    acc[question.section].push({ ...question, index });
    return acc;
  }, {} as Record<string, (Question & { index: number })[]>);

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.size;
  const notAttemptedCount = questions.length - answeredCount - flaggedCount;

  return (
    <div className="w-80 bg-gray-50 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center space-x-2 mb-3">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Test Navigation</h2>
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-green-600 font-semibold">{answeredCount}</div>
            <div className="text-gray-600">Answered</div>
          </div>
          <div className="text-center">
            <div className="text-red-600 font-semibold">{flaggedCount}</div>
            <div className="text-gray-600">Flagged</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-semibold">{notAttemptedCount}</div>
            <div className="text-gray-600">Not Attempted</div>
          </div>
        </div>
      </div>

      {/* Question List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(sections).map(([sectionName, sectionQuestions]) => (
            <Card key={sectionName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {sectionName}
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  {sectionQuestions.length} questions
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-5 gap-2">
                  {sectionQuestions.map((question) => {
                    const status = getQuestionStatus(question);
                    const isCurrent = currentQuestionIndex === question.index;
                    
                    return (
                      <Button
                        key={question.index}
                        variant="outline"
                        size="sm"
                        className={`h-10 w-10 p-0 ${getStatusColor(status, isCurrent)} hover:bg-blue-50`}
                        onClick={() => onQuestionSelect(question.index)}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-medium">
                            {question.index + 1}
                          </span>
                          <div className="absolute -top-1 -right-1">
                            {getStatusIcon(status)}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t bg-white">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-2">
            <Circle className="h-3 w-3 text-gray-400" />
            <span>Not Attempted</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <Flag className="h-3 w-3 text-red-500" />
            <span>Flagged for Review</span>
          </div>
        </div>
      </div>
    </div>
  );
};
