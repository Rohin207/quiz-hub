
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Clock, Users, Play, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Test {
  id: string;
  title: string;
  description: string | null;
  total_questions: number | null;
  duration_minutes: number | null;
  created_at: string;
  exam_pattern: string;
  is_public: boolean;
}

const examCategories = [
  { id: 'jee-mains', name: 'JEE Mains', icon: '🎯' },
  { id: 'jee-advanced', name: 'JEE Advanced', icon: '🚀' },
  { id: 'cuet', name: 'CUET', icon: '🎓' },
  { id: 'sat', name: 'SAT', icon: '🌟' },
  { id: 'bitsat', name: 'BITSAT', icon: '💻' },
  { id: 'neet', name: 'NEET', icon: '🏥' },
  { id: 'gate', name: 'GATE', icon: '⚙️' },
  { id: 'cat', name: 'CAT', icon: '📊' },
  { id: 'gmat', name: 'GMAT', icon: '💼' },
  { id: 'gre', name: 'GRE', icon: '🎯' },
  { id: 'ielts', name: 'IELTS', icon: '🗣️' },
  { id: 'toefl', name: 'TOEFL', icon: '📚' },
  { id: 'upsc', name: 'UPSC', icon: '🏛️' },
  { id: 'ssc', name: 'SSC', icon: '📋' },
  { id: 'bank-po', name: 'Bank PO', icon: '🏦' },
  { id: 'custom', name: 'Custom Tests', icon: '🔧' }
];

export const BrowseTests = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicTests();
    
    // Set up periodic refresh to ensure data is always up-to-date
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh of public tests...');
      fetchPublicTests();
    }, 30000); // Refresh every 30 seconds
    
    console.log('Setting up real-time subscription...');
    
    // Set up real-time subscription for tests - listen to ALL test changes
    const channel = supabase
      .channel('all-tests-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'tests'
          // No filter here - we handle filtering in the callback
        },
        (payload) => {
          console.log('🔥 Real-time update received:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New data:', payload.new);
          console.log('Old data:', payload.old);
          
          if (payload.eventType === 'INSERT') {
            const newTest = payload.new as Test;
            console.log('📝 New test inserted, is_public:', newTest.is_public);
            // Only add if it's public
            if (newTest.is_public) {
              console.log('✅ Adding public test to list');
              setTests(current => {
                // Check if test already exists to avoid duplicates
                const exists = current.find(test => test.id === newTest.id);
                if (!exists) {
                  const updated = [newTest, ...current];
                  console.log('Updated tests list length:', updated.length);
                  return updated;
                }
                return current;
              });
              
              // Show toast notification
              toast({
                title: "New test available!",
                description: `"${newTest.title}" has been added to ${examCategories.find(cat => cat.id === newTest.exam_pattern)?.name || 'Custom'} tests.`,
              });
            } else {
              console.log('❌ Test is private, not adding to list');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTest = payload.new as Test;
            console.log('📝 Test updated, is_public:', updatedTest.is_public);
            
            setTests(current => {
              // If test became public, add it
              if (updatedTest.is_public) {
                const exists = current.find(test => test.id === updatedTest.id);
                if (!exists) {
                  console.log('✅ Test became public, adding to list');
                  return [updatedTest, ...current];
                } else {
                  console.log('📝 Updating existing public test');
                  return current.map(test => 
                    test.id === updatedTest.id ? updatedTest : test
                  );
                }
              } else {
                // If test became private, remove it
                console.log('❌ Test became private, removing from list');
                return current.filter(test => test.id !== updatedTest.id);
              }
            });
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Test deleted, removing from list');
            setTests(current => 
              current.filter(test => test.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          // Fallback: refresh data when real-time fails
          console.log('🔄 Refreshing data due to real-time connection error...');
          fetchPublicTests();
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Real-time subscription timed out');
          // Fallback: refresh data when real-time times out
          console.log('🔄 Refreshing data due to real-time timeout...');
          fetchPublicTests();
        }
      });

    return () => {
      console.log('🔌 Cleaning up real-time subscription and refresh interval');
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPublicTests = async () => {
    try {
      console.log('🔍 Fetching public tests...');
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_public', true)  // Only fetch public tests
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📊 Fetched public tests:', data?.length || 0, 'tests');
      console.log('Tests data:', data);
      
      // Group tests by exam pattern for debugging
      const groupedTests = data?.reduce((acc, test) => {
        acc[test.exam_pattern] = (acc[test.exam_pattern] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      console.log('📈 Tests by category:', groupedTests);
      
      setTests(data || []);
    } catch (error) {
      console.error('❌ Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || test.exam_pattern === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTestsByCategory = (categoryId: string) => {
    const categoryTests = tests.filter(test => test.exam_pattern === categoryId);
    console.log(`📂 Tests for category ${categoryId}:`, categoryTests.length, categoryTests);
    return categoryTests;
  };

  if (selectedCategory) {
    const categoryTests = getTestsByCategory(selectedCategory);
    const categoryInfo = examCategories.find(cat => cat.id === selectedCategory);
    
    console.log('🎯 Selected category:', selectedCategory);
    console.log('📋 Category tests:', categoryTests);
    console.log('🔍 Filtered tests (after search):', filteredTests);

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setSelectedCategory(null)}
              className="mb-4"
            >
              ← Back to Categories
            </Button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{categoryInfo?.icon}</span>
              <h1 className="text-2xl font-bold text-gray-900">{categoryInfo?.name} Tests</h1>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary">
                {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} found
              </Badge>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tests available</h3>
              <p className="text-gray-600">
                {categoryTests.length === 0 
                  ? `No tests have been uploaded for ${categoryInfo?.name} yet.`
                  : searchTerm 
                    ? `No tests match your search "${searchTerm}" in ${categoryInfo?.name}.`
                    : "No tests available."
                }
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Debug: Total tests: {tests.length}, Category tests: {categoryTests.length}, Filtered: {filteredTests.length}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTests.map((test) => (
                <Card key={test.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{test.title}</span>
                      <Badge variant="outline" className="ml-2">
                        {examCategories.find(cat => cat.id === test.exam_pattern)?.name || 'Custom'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {test.total_questions || 0} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {test.duration_minutes || 60} mins
                        </span>
                      </div>
                    </div>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Tests</h1>
          <p className="text-gray-600">Explore tests by category and start practicing</p>
        </div>

        <div className="flex items-center space-x-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">
            {tests.length} total test{tests.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading test categories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {examCategories.map((category) => {
              const categoryTests = getTestsByCategory(category.id);
              return (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader className="text-center">
                    <div className="text-4xl mb-2">{category.icon}</div>
                    <CardTitle className="flex items-center justify-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      {category.name}
                    </CardTitle>
                    <CardDescription>
                      {categoryTests.length} test{categoryTests.length !== 1 ? 's' : ''} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Tests
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
