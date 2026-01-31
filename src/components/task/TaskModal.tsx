/**
 * 任务模态框组件 - 创建和编辑任务
 * 支持自然语言输入、AI解析、详细字段编辑
 * 2026 Design Principles: Minimalist, Efficient, Aesthetic
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Task, TaskCategory, TaskPriority, SubTask } from '@/types';
import { format, addDays } from 'date-fns';
import { 
  X, 
  Save, 
  Sparkles, 
  Plus, 
  Clock,
  Calendar,
  BookOpen,
  Heart,
  Home,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Coffee,
  Zap,
  Flag,
  Circle,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface TaskModalProps {
  task?: Task;
  defaultDate?: Date;
  onClose?: () => void;
  onSave?: (task: Task) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  task, 
  defaultDate = new Date(),
  onClose, 
  onSave 
}) => {
  const { addTask, updateTask, parseNaturalLanguage, isAIProcessing } = useAppStore();
  
  // 表单状态
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [startDate, setStartDate] = useState(
    task ? format(task.startTime, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(
    task ? format(task.startTime, 'HH:mm') : '09:00'
  );
  const [endDate, setEndDate] = useState(
    task ? format(task.endTime, 'yyyy-MM-dd') : format(defaultDate, 'yyyy-MM-dd')
  );
  const [endTime, setEndTime] = useState(
    task ? format(task.endTime, 'HH:mm') : '10:00'
  );
  const [estimatedDuration, setEstimatedDuration] = useState(task?.estimatedDuration || 60);
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'work');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'important-not-urgent');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'planning');
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || []);
  const [reminderMinutes, setReminderMinutes] = useState(task?.reminderMinutes ?? 5);
  
  // AI输入状态
  const [naturalInput, setNaturalInput] = useState('');
  const [showAIInput, setShowAIInput] = useState(true);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦AI输入框
  useEffect(() => {
    if (showAIInput && aiInputRef.current && !task) {
      aiInputRef.current.focus();
    }
  }, [showAIInput, task]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 类别选项 - Compact Config
  const categoryOptions = [
    { value: 'work' as TaskCategory, label: '工作', icon: Briefcase },
    { value: 'study' as TaskCategory, label: '学习', icon: BookOpen },
    { value: 'health' as TaskCategory, label: '健康', icon: Heart },
    { value: 'life' as TaskCategory, label: '生活', icon: Coffee },
    { value: 'other' as TaskCategory, label: '其他', icon: MoreHorizontal }
  ];

  // 优先级选项 - Compact Config
  const priorityOptions = [
    { value: 'urgent-important' as TaskPriority, label: '急+重', icon: Zap, color: 'bg-red-500 text-white border-red-500' },
    { value: 'urgent-unimportant' as TaskPriority, label: '急+轻', icon: AlertCircle, color: 'bg-orange-400 text-white border-orange-400' },
    { value: 'important-not-urgent' as TaskPriority, label: '缓+重', icon: Flag, color: 'bg-blue-500 text-white border-blue-500' },
    { value: 'not-important-not-urgent' as TaskPriority, label: '缓+轻', icon: Circle, color: 'bg-gray-400 text-white border-gray-400' }
  ];

  // 状态选项 - Compact Config
  const statusOptions = [
    { value: 'planning' as Task['status'], label: '规划', icon: AlertCircle },
    { value: 'not-started' as Task['status'], label: '待办', icon: Clock },
    { value: 'in-progress' as Task['status'], label: '进行', icon: Play },
    { value: 'paused' as Task['status'], label: '暂停', icon: Pause },
    { value: 'completed' as Task['status'], label: '完成', icon: CheckCircle },
  ];

  const quickTimeOptions = [
    { label: '今天', value: 'today', date: new Date() },
    { label: '明天', value: 'tomorrow', date: addDays(new Date(), 1) },
  ];

  const durationOptions = [15, 30, 60, 90, 120];

  const reminderOptions = [
    { value: 5, label: '5分钟' },
    { value: 15, label: '15分钟' },
    { value: 30, label: '30分钟' },
    { value: 45, label: '45分钟' },
    { value: 60, label: '1小时' },
  ];

  const handleAIParse = async () => {
    if (!naturalInput.trim()) return;

    try {
      const parsedTask = await parseNaturalLanguage(naturalInput);
      console.debug('【AI解析】原始解析结果:', parsedTask);
      
      if (parsedTask.title) setTitle(parsedTask.title);
      if (parsedTask.description) setDescription(parsedTask.description);
      if (parsedTask.startTime) {
        setStartDate(format(parsedTask.startTime, 'yyyy-MM-dd'));
        setStartTime(format(parsedTask.startTime, 'HH:mm'));
      }
      if (parsedTask.endTime) {
        setEndDate(format(parsedTask.endTime, 'yyyy-MM-dd'));
        setEndTime(format(parsedTask.endTime, 'HH:mm'));
      }
      if (parsedTask.estimatedDuration) setEstimatedDuration(parsedTask.estimatedDuration);
      if (parsedTask.category) setCategory(parsedTask.category);
      if (parsedTask.priority) setPriority(parsedTask.priority);

      toast.success('AI解析成功！');
      // FIXED: Do NOT collapse or clear input
      // setShowAIInput(false);
      // setNaturalInput('');
    } catch (error) {
      toast.error('AI解析失败，请重试');
    }
  };

  const handleQuickTimeSelect = (option: typeof quickTimeOptions[0]) => {
    const date = format(option.date, 'yyyy-MM-dd');
    setStartDate(date);
    setEndDate(date);
  };

  const handleDurationSelect = (duration: number) => {
    setEstimatedDuration(duration);
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(start.getTime() + duration * 60000);
    setEndDate(format(end, 'yyyy-MM-dd'));
    setEndTime(format(end, 'HH:mm'));
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, {
      id: Date.now().toString(),
      title: '',
      status: 'not-started',
      estimatedDuration: 30,
      order: subtasks.length
    }]);
  };

  const updateSubtask = (index: number, updates: Partial<SubTask>) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], ...updates };
    setSubtasks(updated);
  };

  const deleteSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入任务标题');
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      const taskData: Task = {
        id: task?.id || Date.now().toString(),
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        estimatedDuration,
        priority,
        status,
        category,
        subtasks,
        createdAt: task?.createdAt || new Date(),
        updatedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : undefined
      };

      if (task) {
        await updateTask(task.id, taskData);
        toast.success('任务更新成功');
      } else {
        await addTask(taskData);
        toast.success('任务创建成功');
      }

      if (onSave) onSave(taskData);
      if (onClose) onClose();
    } catch (error) {
      console.error('【任务管理】保存任务失败:', error);
      toast.error('保存任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {task ? '编辑任务' : '创建任务'}
            </h2>
            {task && (
               <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 font-mono">
                 {task.id.slice(-4)}
               </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            
            {/* AI Parsing Section */}
            <div className={clsx(
              "transition-all duration-300 ease-in-out border rounded-2xl overflow-hidden group",
              showAIInput ? "bg-gray-50 border-gray-200 shadow-inner" : "bg-white border-transparent"
            )}>
              <div 
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setShowAIInput(!showAIInput)}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Sparkles className={clsx("w-4 h-4 transition-colors", showAIInput ? "text-purple-600" : "text-gray-400")} />
                  <span>AI 智能助手</span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                  {showAIInput ? '收起' : '展开'}
                </span>
              </div>
              
              {showAIInput && (
                <div className="px-4 pb-4">
                  <textarea
                    ref={aiInputRef}
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    placeholder="输入自然语言，例如：明天下午3点和产品经理开会，重要..."
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-black/5 focus:border-black/20 resize-none transition-all placeholder:text-gray-400"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleAIParse}
                      disabled={isAIProcessing || !naturalInput.trim()}
                      className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      {isAIProcessing ? '解析中...' : '开始解析'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <form id="task-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Title & Description */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-900 placeholder-gray-300 border-0 focus:ring-0 p-0 bg-transparent transition-colors"
                  placeholder="任务标题"
                  required
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-base text-gray-600 placeholder-gray-400 border-0 focus:ring-0 p-0 bg-transparent resize-none min-h-[60px]"
                  placeholder="添加描述..."
                  rows={2}
                />
              </div>

              <div className="h-px bg-gray-100" />

              {/* Properties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* Left Column: Time */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 日期
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setEndDate(e.target.value); }}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-300"
                      />
                      <div className="flex gap-1">
                        {quickTimeOptions.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleQuickTimeSelect(opt)}
                            className="px-2 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 时间 ({estimatedDuration}m)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-300"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-300"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {durationOptions.map(dur => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleDurationSelect(dur)}
                          className={clsx(
                            "px-2 py-1 text-xs rounded-md border transition-all",
                            estimatedDuration === dur
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reminder */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Bell className="w-3 h-3" /> 提醒 (提前)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {reminderOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setReminderMinutes(opt.value)}
                          className={clsx(
                            "px-2 py-1 text-xs rounded-md border transition-all",
                            reminderMinutes === opt.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Attributes */}
                <div className="space-y-6">
                  {/* Priority */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">优先级</label>
                    <div className="flex flex-wrap gap-2">
                      {priorityOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPriority(opt.value)}
                          className={clsx(
                            "px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all",
                            priority === opt.value
                              ? opt.color.replace('border-', 'border-2 ') // Highlight selected
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {priority === opt.value && <opt.icon className="w-3 h-3" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">分类</label>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategory(opt.value)}
                          className={clsx(
                            "px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all",
                            category === opt.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <opt.icon className="w-3 h-3" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">状态</label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={clsx(
                            "px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all",
                            status === opt.value
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <opt.icon className="w-3 h-3" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    子任务 ({subtasks.length})
                  </label>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="flex items-center gap-1 text-xs font-medium text-black hover:opacity-70 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                    添加子任务
                  </button>
                </div>
                
                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div key={subtask.id} className="flex items-center gap-2 group">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      <input
                        type="text"
                        value={subtask.title}
                        onChange={(e) => updateSubtask(index, { title: e.target.value })}
                        placeholder="输入子任务..."
                        className="flex-1 bg-transparent border-b border-transparent focus:border-gray-300 focus:ring-0 px-0 py-1 text-sm text-gray-700 placeholder-gray-400 transition-colors"
                      />
                      <input
                        type="number"
                        value={subtask.estimatedDuration}
                        onChange={(e) => updateSubtask(index, { estimatedDuration: parseInt(e.target.value) || 0 })}
                        className="w-12 bg-transparent border-0 text-right text-xs text-gray-400 focus:ring-0 px-0"
                        placeholder="30"
                      />
                      <span className="text-xs text-gray-400">m</span>
                      <button
                        type="button"
                        onClick={() => deleteSubtask(index)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {subtasks.length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-400 dashed border border-gray-200 rounded-lg">
                      暂无子任务
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="bg-black text-white px-8 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-black/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? '保存中...' : (task ? '更新任务' : '创建任务')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
