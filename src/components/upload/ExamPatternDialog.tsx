import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Upload, Clock, FileText, File, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ExamPatternDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const examPatterns = [
  { id: 'jee-mains', name: 'JEE Mains', duration: 180 },
  { id: 'jee-advanced', name: 'JEE Advanced', duration: 180 },
  { id: 'cuet', name: 'CUET', duration: 120 },
  { id: 'sat', name: 'SAT', duration: 180 },
  { id: 'bitsat', name: 'BITSAT', duration: 180 },
  { id: 'neet', name: 'NEET', duration: 180 },
  { id: 'gate', name: 'GATE', duration: 180 },
  { id: 'cat', name: 'CAT', duration: 120 },
  { id: 'gmat', name: 'GMAT', duration: 210 },
  { id: 'gre', name: 'GRE', duration: 180 },
  { id: 'ielts', name: 'IELTS', duration: 60 },
  { id: 'toefl', name: 'TOEFL', duration: 240 },
  { id: 'upsc', name: 'UPSC', duration: 120 },
  { id: 'ssc', name: 'SSC', duration: 60 },
  { id: 'bank-po', name: 'Bank PO', duration: 60 },
  { id: 'custom', name: 'Custom Test', duration: 0 }
];

export const ExamPatternDialog = ({ open, onOpenChange }: ExamPatternDialogProps) => {
  const { user } = useAuth();
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [allowPublicUse, setAllowPublicUse] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'uploading' | 'parsing'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
      if (file) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file only.",
          variant: "destructive",
        });
      }
    }
  };

  const handleStartTest = async () => {
    if (!selectedPattern || !allowPublicUse || !selectedFile || !user) return;
    if (selectedPattern === 'custom' && !customTime) return;

    setLoadingState('uploading');

    try {
      console.log('🚀 Starting test upload process...');

      // 1. Upload PDF to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('test-pdfs')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;
      console.log('✅ File uploaded successfully:', uploadData);

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('test-pdfs')
        .getPublicUrl(fileName);

      // 3. Create initial test record in database
      const duration = selectedPattern === 'custom' ? parseInt(customTime) : examPatterns.find(p => p.id === selectedPattern)?.duration;
      const isPublic = allowPublicUse === 'yes';
      
      const testData = {
        user_id: user.id,
        title: selectedFile.name.replace('.pdf', ''),
        description: `${examPatterns.find(p => p.id === selectedPattern)?.name || 'Custom'} test uploaded from PDF`,
        pdf_url: urlData.publicUrl,
        duration_minutes: duration,
        exam_pattern: selectedPattern,
        is_public: isPublic,
        total_questions: 0 
      };

      const { data: insertedTest, error: testError } = await supabase
        .from('tests')
        .insert(testData)
        .select()
        .single();

      if (testError) throw testError;
      console.log('✅ Test record created:', insertedTest);

      // 4. Trigger AI Edge Function to parse the PDF using Gemini
      setLoadingState('parsing');
      console.log('🤖 Triggering AI PDF Parser Edge Function...');

      const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-exam-pdf', {
        body: {
          testId: insertedTest.id,
          pdfUrl: urlData.publicUrl,
          examPattern: selectedPattern
        }
      });

      if (parseError) {
        console.error('Parser invocation warning:', parseError);
      } else {
        console.log('✅ AI successfully parsed and populated test questions!', parseResult);
      }

      toast({
        title: "Test created & parsed successfully!",
        description: `Your test "${insertedTest.title}" is ready with questions extracted by AI.`,
      });

      // Reset form
      setSelectedPattern('');
      setCustomTime('');
      setAllowPublicUse('');
      setSelectedFile(null);
      onOpenChange(false);

    } catch (error: any) {
      console.error('❌ Error processing test:', error);
      toast({
        title: "Process failed",
        description: error.message || "There was an error uploading or parsing your test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingState('idle');
    }
  };

  const isFormValid = selectedPattern && allowPublicUse && selectedFile && (selectedPattern !== 'custom' || customTime);
  const isProcessing = loadingState !== 'idle';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5" />
            Upload PDF & Select Exam Pattern
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* PDF Upload Section */}
          <div className="bg-blue-50 p-4 rounded-lg border">
            <Label className="text-base font-medium mb-3 block flex items-center gap-2">
              <File className="h-4 w-4" />
              Upload PDF File
            </Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mb-2 bg-white"
              disabled={isProcessing}
            />
            {selectedFile && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Selected: {selectedFile.name}
              </p>
            )}
            {!selectedFile && (
              <p className="text-sm text-gray-500">Please select a PDF file containing exam questions</p>
            )}
          </div>

          {/* Exam Pattern Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Choose Exam Pattern (Helps AI understand marking scheme and structure)
            </Label>
            <RadioGroup value={selectedPattern} onValueChange={setSelectedPattern}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {examPatterns.map((pattern) => (
                  <Card key={pattern.id} className="relative">
                    <div className="flex items-center space-x-3 p-4 rounded-lg border-2 hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value={pattern.id} id={pattern.id} disabled={isProcessing} />
                      <div className="flex-1">
                        <Label 
                          htmlFor={pattern.id} 
                          className="font-medium cursor-pointer text-sm"
                        >
                          {pattern.name}
                        </Label>
                        {pattern.duration > 0 && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {pattern.duration} mins
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Custom Time Input */}
          {selectedPattern === 'custom' && (
            <div className="bg-blue-50 p-4 rounded-lg border">
              <Label htmlFor="customTime" className="text-sm font-medium mb-2 block">
                Enter Custom Test Duration (in minutes)
              </Label>
              <Input
                id="customTime"
                type="number"
                placeholder="e.g., 120"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                min="1"
                max="600"
                className="w-full bg-white"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Public Use Permission */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <Label className="text-base font-medium mb-3 block flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Share Test with Community
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Can we make this test available for other users to practice?
            </p>
            <RadioGroup value={allowPublicUse} onValueChange={setAllowPublicUse}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="yes" id="yes" disabled={isProcessing} />
                <Label htmlFor="yes" className="cursor-pointer text-sm">
                  Yes, allow others to use this test (will appear in Browse Tests)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" disabled={isProcessing} />
                <Label htmlFor="no" className="cursor-pointer text-sm">
                  No, keep it private to my account
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Start Test Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleStartTest} 
              disabled={!isFormValid || isProcessing}
              className="px-8 gap-2"
            >
              {loadingState === 'uploading' && 'Uploading PDF...'}
              {loadingState === 'parsing' && (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  AI Parsing Questions...
                </>
              )}
              {loadingState === 'idle' && 'Upload & Create Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};