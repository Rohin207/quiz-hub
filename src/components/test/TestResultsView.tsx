
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, Bot, CheckCircle, XCircle, Clock, FileText, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResultsViewProps {
  results: {
    testId: string;
    testTitle: string;
    totalQuestions: number;
    answers: Record<string, any>;
    submittedAt: string;
    status: 'submitted' | 'checked' | 'ai-checked';
    score?: number;
    maxScore?: number;
    checkedAnswers?: Record<string, { isCorrect: boolean; correctAnswer?: string; marks: number; feedback?: string }>;
    attemptId?: string;
    aiFeedback?: string;
    questions?: any[];
  };
  onBackToDashboard: () => void;
}

export const TestResultsView = ({ results, onBackToDashboard }: TestResultsViewProps) => {
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnswerKeyFile(file);
      toast({
        title: "File Selected",
        description: `Selected: ${file.name}`,
      });
    }
  };

  const updateTestAttemptWithResults = async (attemptId: string, updateData: any) => {
    try {
      const { error } = await supabase
        .from('test_attempts')
        .update(updateData)
        .eq('id', attemptId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating test attempt:', error);
      throw error;
    }
  };

  const handleUploadAndAICheck = async () => {
    if (!answerKeyFile) {
      toast({
        title: "Error",
        description: "Please select an answer key file first",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Convert file to base64 for AI processing
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(answerKeyFile);
      });

      console.log('Processing answer key with AI extraction...');
      
      const { data, error } = await supabase.functions.invoke('ai-check-with-key', {
        body: {
          answerKeyFile: fileContent,
          userAnswers: results.answers,
          testTitle: results.testTitle,
          totalQuestions: results.totalQuestions
        }
      });

      if (error) throw error;

      if (data.success) {
        // Update the results with AI checking
        const checkedAnswers = data.checkedAnswers;
        const totalScore = data.totalScore;
        const extractedAnswers = data.extractedAnswers;
        
        // Update database with results
        await updateTestAttemptWithResults(results.attemptId!, {
          score: totalScore,
          status: 'ai-checked'
        });
        
        toast({
          title: "AI Checking Complete",
          description: `Your test has been checked. Score: ${totalScore}/${results.totalQuestions}`,
        });
        
        // Refresh the view to show results
        window.location.reload();
      } else {
        toast({
          title: "API Key Required",
          description: data.message || "OpenAI API key not configured",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error processing answer key:', error);
      toast({
        title: "Error",
        description: "Failed to process answer key with AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePureAICheck = async () => {
    setIsProcessing(true);
    
    try {
      console.log('Starting pure AI checking...');
      
      const { data, error } = await supabase.functions.invoke('ai-pure-check', {
        body: {
          userAnswers: results.answers,
          testTitle: results.testTitle,
          totalQuestions: results.totalQuestions,
          questions: results.questions || []
        }
      });

      if (error) throw error;

      if (data.success) {
        // Update the results with AI checking
        const checkedAnswers = data.checkedAnswers;
        const totalScore = data.totalScore;
        const feedback = data.overallFeedback;
        
        // Update database with results
        await updateTestAttemptWithResults(results.attemptId!, {
          score: totalScore,
          status: 'ai-checked'
        });
        
        toast({
          title: "AI Analysis Complete",
          description: `Your test has been analyzed. Score: ${totalScore}/${results.totalQuestions}`,
        });
        
        // Refresh the view to show results
        window.location.reload();
      } else {
        toast({
          title: "API Key Required",
          description: data.message || "OpenAI API key not configured",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error with pure AI checking:', error);
      toast({
        title: "Error",
        description: "Failed to check answers with AI",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isChecked = results.status === 'checked' || results.status === 'ai-checked';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analytics
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Test Results</h1>
            </div>
            <Badge variant="outline" className="text-sm">
              Status: {results.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Test Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{results.testTitle}</span>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(results.submittedAt)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(results.answers).length}
                </div>
                <div className="text-sm text-gray-600">Questions Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {results.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {isChecked ? `${results.score}/${results.maxScore || results.totalQuestions}` : 'Pending'}
                </div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Checking Options - Show this for submitted tests */}
        {results.status === 'submitted' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span>AI-Powered Checking Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Choose how you want to check your test answers using AI:
              </div>

              {/* Upload Answer Key + AI Extraction */}
              <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-lg">Upload Answer Key + AI Extraction</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Upload your answer key file (PDF, image, or document) and our AI will extract the correct answers and check your responses automatically.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="answerKeyFile" className="text-sm font-medium">Choose Answer Key File</Label>
                    <Input
                      id="answerKeyFile"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, JPG, PNG, TXT, DOC, DOCX
                    </p>
                  </div>
                  <Button 
                    onClick={handleUploadAndAICheck}
                    disabled={!answerKeyFile || isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing with AI...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Check with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Pure AI Checking */}
              <div className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 mb-3">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="font-medium text-lg">Pure AI Knowledge Checking</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Let our advanced AI (GPT-4) use its own knowledge to evaluate your answers, provide scoring, and give detailed feedback without needing an answer key.
                </p>
                <Button 
                  onClick={handlePureAICheck}
                  variant="outline"
                  className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                  disabled={isProcessing}
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Check with AI Knowledge
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Feedback Section */}
        {results.aiFeedback && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span>AI Feedback</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700">{results.aiFeedback}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Display (if checked) */}
        {isChecked && results.checkedAnswers && Object.keys(results.checkedAnswers).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(results.checkedAnswers).map(([questionId, result]) => (
                  <div key={questionId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Question {questionId}</span>
                      <div className="flex items-center space-x-2">
                        {result.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Badge variant={result.isCorrect ? "default" : "destructive"}>
                          {result.marks} marks
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Your Answer:</strong> {results.answers[questionId]}</p>
                      {!result.isCorrect && result.correctAnswer && (
                        <p><strong>Correct Answer:</strong> {result.correctAnswer}</p>
                      )}
                      {result.feedback && (
                        <p><strong>Feedback:</strong> {result.feedback}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Your Answers Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submitted Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(results.answers).map(([questionId, answer]) => (
                <div key={questionId} className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">Question {questionId}</span>
                  <span className="text-gray-600">
                    {Array.isArray(answer) ? answer.join(', ') : answer}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
