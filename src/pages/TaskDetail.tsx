import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, Flag, Tag } from 'lucide-react';
import { useAppStore } from '../store';
import { TaskStatus, TaskPriority, TaskCategory } from '../types';
import { format } from 'date-fns';

/**
 * 任务详情页面
 * 提供任务编辑、子任务管理、优先级设置等功能
 */
const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    tasks, 
    updateTask, 
    deleteTask, 
    addSubtask,
    updateSubtask,
    deleteSubtask
  } = useAppStore();

  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">任务未找到</h2>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-900"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = React.useState({
    title: task.title,
    description: task.description || '',
    startTime: format(new Date(task.startTime), 'yyyy-MM-dd\'T\'HH:mm'),
    endTime: format(new Date(task.endTime), 'yyyy-MM-dd\'T\'HH:mm'),
    estimatedDuration: task.estimatedDuration,
    priority: task.priority,
    status: task.status,
    category: task.category
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');

  const handleSave = () => {
    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);
    
    updateTask(task.id, {
      ...formData,
      startTime,
      endTime,
      updatedAt: new Date()
    });
    
    navigate('/');
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个任务吗？')) {
      deleteTask(task.id);
      navigate('/');
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const priorityOptions = [
    { value: 'urgent-important', label: '紧急+重要', color: 'bg-black', desc: '立即处理' },
    { value: 'urgent-unimportant', label: '紧急+不重要', color: 'bg-gray-600', desc: '委托他人' },
    { value: 'important-not-urgent', label: '重要+不紧急', color: 'bg-gray-400', desc: '计划执行' },
    { value: 'not-important-not-urgent', label: '不重要+不紧急', color: 'bg-gray-200', desc: '可以推迟' }
  ];

  const statusOptions = [
    { value: 'planning', label: '规划中' },
    { value: 'not-started', label: '未开始' },
    { value: 'in-progress', label: '进行中' },
    { value: 'paused', label: '暂停中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' }
  ];

  const categoryOptions = [
    { value: 'work', label: '工作' },
    { value: 'study', label: '学习' },
    { value: 'health', label: '健康' },
    { value: 'life', label: '生活' },
    { value: 'other', label: '其他' }
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">编辑任务</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除</span>
          </button>
            
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-3 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Tag className="w-5 h-5" />
              <span>基本信息</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="输入任务标题"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent h-24 resize-none text-gray-900 placeholder-gray-400"
                  placeholder="输入任务描述（可选）"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始时间
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束时间
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预估时长（分钟）
                </label>
                <input
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                  min="0"
                  step="15"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务类别
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TaskCategory }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 优先级设置 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Flag className="w-5 h-5" />
              <span>优先级设置</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, priority: option.value as TaskPriority }))}
                  className={`p-4 rounded-lg border transition-all ${
                    formData.priority === option.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${option.color}`} />
                    <div className="font-medium text-gray-900">{option.label}</div>
                  </div>
                  <div className="text-sm text-gray-500 text-left">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 子任务管理 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Plus className="w-5 h-5" />
              <span>子任务</span>
            </h2>
            
            <div className="space-y-3 mb-4">
              {task.subtasks.map((subtask, index) => (
                <div key={subtask.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                  <input
                    type="checkbox"
                    checked={subtask.status === 'completed'}
                    onChange={(e) => {
                      const newStatus = e.target.checked ? 'completed' : 'not-started';
                      updateSubtask(task.id, subtask.id, { status: newStatus });
                    }}
                    className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black"
                  />
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(e) => updateSubtask(task.id, subtask.id, { title: e.target.value })}
                    className={`flex-1 px-2 py-1 bg-transparent border border-transparent hover:border-gray-200 rounded text-sm text-gray-900 focus:bg-white focus:border-gray-300 focus:outline-none ${
                      subtask.status === 'completed' ? 'line-through text-gray-400' : ''
                    }`}
                  />
                  <button
                    onClick={() => updateSubtask(task.id, subtask.id, { 
                      estimatedDuration: Math.max(15, subtask.estimatedDuration + 15) 
                    })}
                    className="text-xs px-2 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-600 transition-colors"
                  >
                    +15
                  </button>
                  <span className="text-xs text-gray-500 min-w-12 text-right">
                    {subtask.estimatedDuration}分钟
                  </span>
                  <button
                    onClick={() => deleteSubtask(task.id, subtask.id)}
                    className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="添加子任务"
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={handleAddSubtask}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
