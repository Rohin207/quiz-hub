import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Upload, Play, BarChart3, LogOut, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ExamPatternDialog } from '@/components/upload/ExamPatternDialog';
import { BrowseTests } from '@/components/browse/BrowseTests';
import { TestTakingPanel } from '@/components/test/TestTakingPanel';
import { TestResultsView } from '@/components/test/TestResultsView';
import { ViewAnalytics } from '@/components/analytics/ViewAnalytics';

interface Test {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  duration_minutes: number;
  created_at: string;
  exam_pattern?: string;
  is_public?: boolean;
}

// Sample questions for testing (will be replaced with AI-generated questions)
const sampleQuestions = [
  {
    id: '1',
    type: 'mcq' as const,
    section: 'Mathematics',
    question: 'What is the value of 2 + 2?',
    options: ['3', '4', '5', '6'],
    marks: 1
  },
  {
    id: '2',
    type: 'multi-correct' as const,
    section: 'Science',
    question: 'Which of the following are primary colors?',
    options: ['Red', 'Green', 'Blue', 'Yellow', 'Orange'],
    marks: 2
  },
  {
    id: '3',
    type: 'numerical' as const,
    section: 'Mathematics',
    question: 'Calculate the square root of 64.',
    marks: 1
  },
  {
    id: '4',
    type: 'matrix-match' as const,
    section: 'General Knowledge',
    question: 'Match the countries with their capitals:',
    matrix: {
      left: ['India', 'France', 'Japan'],
      right: ['New Delhi', 'Paris', 'Tokyo']
    },
    marks: 3
  },
  {
    id: '5',
    type: 'subjective' as const,
    section: 'English',
    question: 'Write a short paragraph about the importance of education.',
    marks: 5
  }
];

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'browse' | 'test' | 'analytics'>('dashboard');
  const [currentTest, setCurrentTest] = useState<any>(null);

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchTests();
    }
  }, [currentView]);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const handleUploadClick = () => {
    setShowExamDialog(true);
  };

  const handleBrowseClick = () => {
    setCurrentView('browse');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setCurrentTest(null);
  };

  const handleStartTest = (test: Test) => {
    setCurrentTest({
      id: test.id,
      title: test.title,
      duration: test.duration_minutes || 60,
      questions: sampleQuestions
    });
    setCurrentView('test');
  };

  const handleTestSubmit = async (answers: Record<string, any>) => {
    console.log('Test submitted with answers:', answers);
    
    // Here we would save the test attempt to the database
    try {
      const { error } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user?.id,
          test_id: currentTest.id,
          total_questions: currentTest.questions.length,
          status: 'completed',
          finished_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Test Submitted Successfully!",
        description: "Your test has been submitted. Check it in View Analytics.",
      });
      
      // Navigate to analytics instead of results
      setCurrentView('analytics');
      setCurrentTest(null);
    } catch (error) {
      console.error('Error saving test attempt:', error);
      toast({
        title: "Error",
        description: "Failed to save test attempt",
        variant: "destructive",
      });
    }
  };

  const handleViewAnalytics = () => {
    setCurrentView('analytics');
  };

  if (currentView === 'test' && currentTest) {
    return (
      <TestTakingPanel
        testId={currentTest.id}
        testTitle={currentTest.title}
        duration={currentTest.duration}
        questions={currentTest.questions}
        onTestSubmit={handleTestSubmit}
        onExit={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'analytics') {
    return (
      <ViewAnalytics onBackToDashboard={handleBackToDashboard} />
    );
  }

  if (currentView === 'browse') {
    return (
      <div>
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-purple-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">MCQ Test Platform</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={handleBackToDashboard}>
                  ← Back to Dashboard
                </Button>
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>
        <BrowseTests />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary rounded-full blur-2xl opacity-50"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-lg shadow-elegant border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center animate-fade-in">
              <BookOpen className="h-8 w-8 text-purple-600 mr-3 animate-float" />
              <h1 className="text-xl font-semibold text-purple-700">MCQ Test Platform</h1>
            </div>
            <div className="flex items-center space-x-4 animate-slide-up">
              <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:shadow-glow transition-all duration-300">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-4xl font-bold text-purple-600 mb-2 drop-shadow-lg">Dashboard</h2>
          <p className="text-muted-foreground text-lg">Manage your tests and track your progress</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="cursor-pointer group hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-white/30 animate-slide-up" 
                style={{ animationDelay: '0.1s' }} 
                onClick={() => setShowExamDialog(true)}>
            <CardHeader className="text-center">
              <div className="relative">
                <Upload className="h-12 w-12 text-purple-500 mx-auto mb-2 group-hover:animate-float transition-all duration-300" />
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <CardTitle className="group-hover:text-purple-500 transition-colors duration-300">Upload Test</CardTitle>
              <CardDescription>Upload a PDF with MCQs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 group-hover:scale-105" onClick={() => setShowExamDialog(true)}>
                Upload PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer group hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-white/30 animate-slide-up" 
                style={{ animationDelay: '0.2s' }} 
                onClick={() => setCurrentView('browse')}>
            <CardHeader className="text-center">
              <div className="relative">
                <Search className="h-12 w-12 text-teal-500 mx-auto mb-2 group-hover:animate-float transition-all duration-300" />
                <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <CardTitle className="group-hover:text-teal-500 transition-colors duration-300">Browse Tests</CardTitle>
              <CardDescription>Explore available tests by category</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-secondary hover:shadow-glow transition-all duration-300 group-hover:scale-105" variant="outline" onClick={() => setCurrentView('browse')}>
                Browse Tests
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer group hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-white/30 animate-slide-up" 
                style={{ animationDelay: '0.3s' }} 
                onClick={handleViewAnalytics}>
            <CardHeader className="text-center">
              <div className="relative">
                <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-2 group-hover:animate-float transition-all duration-300" />
                <div className="absolute inset-0 bg-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <CardTitle className="group-hover:text-purple-600 transition-colors duration-300">View Analytics</CardTitle>
              <CardDescription>Check your test performance and results</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-accent hover:shadow-glow transition-all duration-300 group-hover:scale-105" variant="outline" onClick={handleViewAnalytics}>
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tests */}
        <Card className="shadow-card bg-white/90 backdrop-blur-sm border-white/30 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary animate-pulse" />
              Your Tests
            </CardTitle>
            <CardDescription>
              {tests.length === 0 ? 'No tests uploaded yet' : `${tests.length} test(s) available`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                Loading tests...
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-8 animate-fade-in">
                <div className="relative">
                  <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4 animate-float" />
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"></div>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No tests yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first PDF to get started</p>
                <Button onClick={() => setShowExamDialog(true)} className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload PDF
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test, index) => (
                  <div key={test.id} 
                       className="flex items-center justify-between p-4 border rounded-lg hover:shadow-card bg-white/50 hover:bg-white/80 transition-all duration-300 hover:-translate-y-1 animate-slide-up group"
                       style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">{test.title}</h4>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                         <span className="flex items-center gap-1">
                           <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                           {test.total_questions} questions
                         </span>
                         <span className="flex items-center gap-1">
                           <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                           {test.duration_minutes} minutes
                         </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                          Created {new Date(test.created_at).toLocaleDateString()}
                        </span>
                        {test.exam_pattern && (
                          <span className="bg-gradient-primary text-white px-2 py-1 rounded-full text-xs font-medium">
                            {test.exam_pattern.toUpperCase()}
                          </span>
                        )}
                        {test.is_public && (
                          <span className="bg-gradient-secondary text-foreground px-2 py-1 rounded-full text-xs font-medium">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" 
                            onClick={() => handleStartTest(test)}
                            className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105 group-hover:animate-pulse">
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Exam Pattern Dialog */}
      <ExamPatternDialog 
        open={showExamDialog} 
        onOpenChange={setShowExamDialog} 
      />
    </div>
  );
};
