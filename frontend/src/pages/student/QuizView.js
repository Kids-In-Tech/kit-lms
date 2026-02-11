import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizView() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    API.get(`/api/quizzes/${quizId}`).then(r => {
      setQuiz(r.data);
      setTimeLeft(r.data.time_limit * 60);
    }).catch(() => toast.error('Error loading quiz')).finally(() => setLoading(false));
  }, [quizId]);

  useEffect(() => {
    if (!quiz || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, submitted]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([qid, ans]) => ({ question_id: qid, answer: ans }));
      const res = await API.post(`/api/quizzes/${quizId}/attempt`, { answers: answerList });
      setResult(res.data);
      setSubmitted(true);
      toast.success(res.data.passed ? 'Congratulations! You passed!' : 'Quiz completed');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error submitting');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#0D9488] border-t-transparent rounded-full animate-spin" /></div>;
  if (!quiz) return <p className="text-[#64748B]">Quiz not found</p>;

  const questions = quiz.questions || [];
  const q = questions[currentQ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-up" data-testid="quiz-view">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[#0D9488] hover:underline mb-4" style={{ fontFamily: 'Space Mono' }} data-testid="quiz-back"><ArrowLeft size={14} />Back</button>

      {/* Quiz Header */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-4 shadow-sm">
        <h1 className="text-xl font-bold text-[#0F172A] mb-2">{quiz.title}</h1>
        <div className="flex items-center gap-5 text-sm text-[#64748B]">
          <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#F59E0B]" />{!submitted ? formatTime(timeLeft) : `${quiz.time_limit} min`}</span>
          <span className="flex items-center gap-1.5"><Target size={14} className="text-[#0D9488]" />{quiz.pass_mark}% to pass</span>
          <span>{questions.length} questions</span>
        </div>
        {!submitted && (
          <div className="flex gap-1.5 mt-4">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${i === currentQ ? 'bg-[#0D9488] text-white' : answers[questions[i]?.question_id] ? 'bg-[#CCFBF1] text-[#0D9488]' : 'bg-[#F1F5F9] text-[#64748B]'}`} style={{ fontFamily: 'Space Mono' }} data-testid={`question-nav-${i}`}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      {submitted && result && (
        <div className={`rounded-2xl p-6 mb-4 border ${result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`} data-testid="quiz-result">
          <div className="flex items-center gap-3 mb-3">
            {result.passed ? <CheckCircle2 size={28} className="text-emerald-500" /> : <XCircle size={28} className="text-red-500" />}
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{result.passed ? 'Congratulations!' : 'Keep Trying!'}</h2>
              <p className="text-sm text-[#64748B]">{result.passed ? 'You passed the quiz!' : 'You did not meet the passing threshold.'}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: result.passed ? '#10B981' : '#EF4444' }}>{result.score}%</p>
              <p className="text-xs text-[#64748B]">Your Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#0F172A]">{quiz.pass_mark}%</p>
              <p className="text-xs text-[#64748B]">Pass Mark</p>
            </div>
          </div>
        </div>
      )}

      {/* Question */}
      {!submitted && q && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm" data-testid="quiz-question">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider" style={{ fontFamily: 'Space Mono' }}>Question {currentQ + 1} of {questions.length}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.type === 'multiple_choice' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`} style={{ fontFamily: 'Space Mono' }}>{q.type === 'multiple_choice' ? 'MCQ' : 'T/F'}</span>
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-5">{q.question}</h3>

          <div className="space-y-2.5">
            {(q.options || []).map((opt, oi) => (
              <button key={oi} onClick={() => setAnswers({ ...answers, [q.question_id]: opt })}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${answers[q.question_id] === opt ? 'border-[#0D9488] bg-[#F0FDFA]' : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'}`}
                data-testid={`option-${oi}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${answers[q.question_id] === opt ? 'border-[#0D9488] bg-[#0D9488]' : 'border-[#CBD5E1]'}`}>
                    {answers[q.question_id] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className={`text-sm font-medium ${answers[q.question_id] === opt ? 'text-[#0D9488]' : 'text-[#334155]'}`}>{opt}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] rounded-xl disabled:opacity-30 transition-all" style={{ fontFamily: 'Space Mono' }}>Previous</button>
            {currentQ < questions.length - 1 ? (
              <button onClick={() => setCurrentQ(currentQ + 1)} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-[#0D9488] hover:bg-[#F0FDFA] rounded-xl transition-all" style={{ fontFamily: 'Space Mono' }} data-testid="next-question-btn">Next <ChevronRight size={14} /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length === 0}
                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#0D9488] to-[#14B8A6] rounded-xl active:scale-[0.97] disabled:opacity-50 shadow-lg shadow-teal-500/20" style={{ fontFamily: 'Space Mono' }} data-testid="submit-quiz-btn">
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
