
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface TestSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredQuestions: number;
  timeLeft: number;
}

export const TestSubmissionDialog = ({
  open,
  onOpenChange,
  onConfirm,
  totalQuestions,
  answeredQuestions,
  timeLeft
}: TestSubmissionDialogProps) => {
  const unansweredQuestions = totalQuestions - answeredQuestions;
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Submit Test</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to submit your test? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Answered Questions</span>
            </div>
            <span className="font-semibold">{answeredQuestions}</span>
          </div>

          {unansweredQuestions > 0 && (
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Unanswered Questions</span>
              </div>
              <span className="font-semibold text-red-600">{unansweredQuestions}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Time Remaining</span>
            </div>
            <span className="font-semibold">{formatTime(timeLeft)}</span>
          </div>

          {unansweredQuestions > 0 && (
            <div className="text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg">
              <p className="font-medium text-yellow-800 mb-1">Warning:</p>
              <p>You have {unansweredQuestions} unanswered questions. These will be marked as incorrect.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Continue Test
          </Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Submit Test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
