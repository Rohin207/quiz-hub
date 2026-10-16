import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testId, pdfUrl, examPattern } = await req.json();
    
    // Grabs the secret you just saved in Lovable Cloud
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Download PDF to base64
    const pdfResponse = await fetch(pdfUrl);
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const systemPrompt = `You are an expert AI exam parser. Analyze the PDF, detect exam details, and extract questions into JSON.

Supported question types: 'mcq', 'multi-correct', 'numerical', 'matrix-match', 'subjective'.

Return ONLY JSON:
{
  "title": "Detected Exam Title",
  "description": "Short description",
  "durationMinutes": 180,
  "questions": [
    {
      "questionNumber": 1,
      "section": "Physics",
      "type": "mcq",
      "questionText": "What is...",
      "optionA": "...",
      "optionB": "...",
      "optionC": "...",
      "optionD": "...",
      "correctAnswer": "Option A"
    }
  ]
}`;

    // 2. Call Gemini via OpenAI-Compatible API Endpoint (FREE TIER)
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Parse this exam PDF for pattern: ${examPattern}` },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${base64Pdf}` }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    const aiData = await aiResponse.json();
    if (!aiData.choices) throw new Error(`Gemini API Error: ${JSON.stringify(aiData)}`);

    const parsedData = JSON.parse(aiData.choices[0].message.content);

    // 3. Update Supabase tests table
    await supabase
      .from('tests')
      .update({
        title: parsedData.title || 'Parsed Exam Test',
        description: parsedData.description || '',
        total_questions: parsedData.questions.length,
        duration_minutes: parsedData.durationMinutes || 180
      })
      .eq('id', testId);

    // 4. Insert Questions into Supabase questions table
    const questionsToInsert = parsedData.questions.map((q: any) => ({
      test_id: testId,
      question_number: q.questionNumber,
      section: q.section || 'General',
      question_text: q.questionText,
      option_a: q.optionA || '',
      option_b: q.optionB || '',
      option_c: q.optionC || '',
      option_d: q.optionD || '',
      correct_answer: q.correctAnswer || ''
    }));

    const { error: insertError } = await supabase.from('questions').insert(questionsToInsert);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      totalQuestions: parsedData.questions.length,
      message: 'PDF parsed successfully with Free Tier Gemini!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});