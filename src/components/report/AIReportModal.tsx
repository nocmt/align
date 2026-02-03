import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { 
  X, 
  Bot, 
  Calendar, 
  Copy, 
  Check, 
  Loader2,
  FileText
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';

type ReportRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

const AIReportModal: React.FC = () => {
  const { modalState, closeModal, tasks, generateTaskReport, isAIProcessing } = useAppStore();
  const [range, setRange] = useState<ReportRange>('daily');
  const [report, setReport] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!modalState.isOpen || modalState.type !== 'ai-report') return null;

  const handleGenerate = async () => {
    let startDate: Date, endDate: Date;
    const now = new Date();

    switch (range) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarterly':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'semi-annual':
        startDate = subMonths(now, 6); // Simplified logic
        endDate = now;
        break;
      case 'annual':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
    }

    const rangeTasks = tasks.filter(t => {
      const tDate = new Date(t.startTime);
      return tDate >= startDate && tDate <= endDate;
    });

    if (rangeTasks.length === 0) {
      toast.error('该时间段内没有任务数据');
      return;
    }

    try {
      const rangeText = {
        'daily': '今天',
        'weekly': '本周',
        'monthly': '本月',
        'quarterly': '本季度',
        'semi-annual': '近半年',
        'annual': '今年'
      }[range];

      const result = await generateTaskReport(rangeText, rangeTasks);
      setReport(result);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-xl flex flex-col m-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI 智能总结报告</h2>
              <p className="text-sm text-gray-500">自动生成任务完成情况分析</p>
            </div>
          </div>
          <button 
            onClick={closeModal}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!report ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">选择时间范围</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'daily', label: '今天' },
                    { id: 'weekly', label: '本周' },
                    { id: 'monthly', label: '本月' },
                    { id: 'quarterly', label: '本季度' },
                    { id: 'semi-annual', label: '半年' },
                    { id: 'annual', label: '全年' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setRange(item.id as ReportRange)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        range === item.id
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-medium mb-1">准备生成报告</h3>
                <p className="text-sm text-gray-500 mb-6">
                  AI 将分析您在选定时间范围内的任务数据，生成包含完成率、时间分配和改进建议的详细报告。
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isAIProcessing}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAIProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Bot className="w-5 h-5" />
                      开始生成
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {report}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <button
              onClick={() => setReport('')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              重新生成
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制报告'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIReportModal;