
import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

interface QuestionRendererProps {
  question: Question;
  answer: any;
  onAnswerChange: (answer: any) => void;
}

export const QuestionRenderer = ({ question, answer, onAnswerChange }: QuestionRendererProps) => {
  const [matrixAnswer, setMatrixAnswer] = useState<Record<string, string>>(answer || {});

  const handleMatrixChange = (leftItem: string, rightItem: string) => {
    const newAnswer = { ...matrixAnswer, [leftItem]: rightItem };
    setMatrixAnswer(newAnswer);
    onAnswerChange(newAnswer);
  };

  const renderMCQ = () => (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4">{question.question}</div>
      <RadioGroup value={answer || ''} onValueChange={onAnswerChange}>
        {question.options?.map((option, index) => (
          <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
            <RadioGroupItem value={option} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const renderMultiCorrect = () => (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4">{question.question}</div>
      <div className="text-sm text-gray-600 mb-4">Select all correct options:</div>
      {question.options?.map((option, index) => (
        <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
          <Checkbox
            id={`option-${index}`}
            checked={(answer || []).includes(option)}
            onCheckedChange={(checked) => {
              const currentAnswers = answer || [];
              if (checked) {
                onAnswerChange([...currentAnswers, option]);
              } else {
                onAnswerChange(currentAnswers.filter((a: string) => a !== option));
              }
            }}
          />
          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
            {option}
          </Label>
        </div>
      ))}
    </div>
  );

  const renderMatrixMatch = () => (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4">{question.question}</div>
      <div className="text-sm text-gray-600 mb-4">Match items from left column with right column:</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Column A</h4>
            <div className="space-y-2">
              {question.matrix?.left.map((leftItem, index) => (
                <div key={index} className="p-2 border rounded">
                  {leftItem}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Column B</h4>
            <div className="space-y-2">
              {question.matrix?.right.map((rightItem, index) => (
                <div key={index} className="p-2 border rounded">
                  {rightItem}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <h4 className="font-medium mb-3">Your Matches:</h4>
        {question.matrix?.left.map((leftItem, index) => (
          <div key={index} className="flex items-center space-x-2 mb-2">
            <span className="w-32">{leftItem}</span>
            <span>→</span>
            <select 
              className="border rounded px-2 py-1"
              value={matrixAnswer[leftItem] || ''}
              onChange={(e) => handleMatrixChange(leftItem, e.target.value)}
            >
              <option value="">Select...</option>
              {question.matrix?.right.map((rightItem, rightIndex) => (
                <option key={rightIndex} value={rightItem}>{rightItem}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNumerical = () => (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4">{question.question}</div>
      <div className="text-sm text-gray-600 mb-4">Enter your numerical answer:</div>
      <Input
        type="number"
        placeholder="Enter your answer"
        value={answer || ''}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="max-w-xs"
      />
    </div>
  );

  const renderSubjective = () => (
    <div className="space-y-4">
      <div className="text-lg font-medium mb-4">{question.question}</div>
      <div className="text-sm text-gray-600 mb-4">Write your detailed answer:</div>
      <Textarea
        placeholder="Enter your answer here..."
        value={answer || ''}
        onChange={(e) => onAnswerChange(e.target.value)}
        className="min-h-32"
      />
    </div>
  );

  const renderQuestion = () => {
    switch (question.type) {
      case 'mcq':
        return renderMCQ();
      case 'multi-correct':
        return renderMultiCorrect();
      case 'matrix-match':
        return renderMatrixMatch();
      case 'numerical':
        return renderNumerical();
      case 'subjective':
        return renderSubjective();
      default:
        return <div>Unknown question type</div>;
    }
  };

  return <div>{renderQuestion()}</div>;
};
