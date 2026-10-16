
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CheckCircle, FileText, Bot, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TestResultsView } from '@/components/test/TestResultsView';

interface TestAttempt {
  id: string;
  test_id: string;
  score: number | null;
  total_questions: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  tests: {
    title: string;
    description: string;
  };
}

interface ViewAnalyticsProps {
  onBackToDashboard: () => void;
}

export const ViewAnalytics = ({ onBackToDashboard }: ViewAnalyticsProps) => {
  const { user } = useAuth();
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  useEffect(() => {
    fetchTestAttempts();
  }, [user?.id]);

  const fetchTestAttempts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('test_attempts')
        .select(`
          *,
          tests (
            title,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      setTestAttempts(data || []);
    } catch (error) {
      console.error('Error fetching test attempts:', error);
      toast({
        title: "Error",
        description: "Failed to load test attempts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnswers = async (attemptId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (error) throw error;
      
      // Convert to the format expected by TestResultsView
      const answers: Record<string, any> = {};
      data?.forEach((answer) => {
        answers[answer.question_id] = answer.selected_answer;
      });
      
      return answers;
    } catch (error) {
      console.error('Error fetching user answers:', error);
      return {};
    }
  };

  const handleViewResult = async (attempt: TestAttempt) => {
    const userAnswers = await fetchUserAnswers(attempt.id);
    
    // Fix the status logic: Only set to 'checked' if the test has actually been AI-checked
    // A test is only considered 'checked' if it has a score AND the status indicates AI checking
    let resultStatus: 'submitted' | 'checked' | 'ai-checked';
    
    if (attempt.score !== null && (attempt.status === 'ai-checked' || attempt.status === 'checked')) {
      resultStatus = attempt.status === 'ai-checked' ? 'ai-checked' : 'checked';
    } else {
      // Even if score exists, if status doesn't indicate AI checking, treat as submitted
      resultStatus = 'submitted';
    }
    
    console.log('Attempt details:', {
      id: attempt.id,
      score: attempt.score,
      status: attempt.status,
      resultStatus: resultStatus
    });
    
    const result = {
      testId: attempt.test_id,
      testTitle: attempt.tests.title,
      totalQuestions: attempt.total_questions,
      answers: userAnswers,
      submittedAt: attempt.finished_at || attempt.started_at,
      status: resultStatus,
      score: attempt.score,
      maxScore: attempt.total_questions,
      checkedAnswers: {}, // This would contain the detailed results from checking
      attemptId: attempt.id
    };
    
    setSelectedResult(result);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startDate: string, endDate: string | null) => {
    if (!endDate) return 'In Progress';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} minutes`;
  };

  if (selectedResult) {
    return (
      <TestResultsView
        results={selectedResult}
        onBackToDashboard={() => setSelectedResult(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={onBackToDashboard} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Test Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Test History</h2>
          <p className="text-gray-600">Review and check your completed tests</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading test attempts...</p>
          </div>
        ) : testAttempts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Taken Yet</h3>
            <p className="text-gray-600">Start taking tests to see your analytics here</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {testAttempts.map((attempt) => (
              <Card key={attempt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{attempt.tests.title}</CardTitle>
                      <CardDescription>{attempt.tests.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={attempt.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {attempt.status}
                      </Badge>
                      {attempt.score !== null && (
                        <Badge variant="outline">
                          Score: {attempt.score}/{attempt.total_questions}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Started</p>
                        <p className="text-sm text-gray-600">{formatDate(attempt.started_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Duration</p>
                        <p className="text-sm text-gray-600">
                          {formatDuration(attempt.started_at, attempt.finished_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Questions</p>
                        <p className="text-sm text-gray-600">{attempt.total_questions}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {attempt.status === 'completed' ? (
                        <Button onClick={() => handleViewResult(attempt)}>
                          {attempt.score !== null ? 'View Results' : 'Check Test'}
                        </Button>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
