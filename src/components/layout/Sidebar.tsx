import React from 'react';
import { 
  Calendar, 
  List, 
  Columns, 
  Sun, 
  Coffee, 
  Eye, 
  Filter,
  Zap,
  BarChart3
} from 'lucide-react';
import { useAppStore } from '../../store';
import { format } from 'date-fns';

/**
 * 侧边栏组件
 * 提供视图切换、快速筛选、今日概览等功能
 */
const Sidebar: React.FC = () => {
  const { 
    sidebarOpen, 
    selectedView, 
    setSelectedView,
    selectedCategory,
    setSelectedCategory,
    tasks,
    todayTasks,
    completedTodayTasks,
    toggleHealthReminders,
    aiConfig
  } = useAppStore();

  const viewOptions = [
    { id: 'week', label: '周视图', icon: Calendar },
    { id: 'day', label: '日视图', icon: Sun },
    { id: 'list', label: '列表视图', icon: List },
    { id: 'kanban', label: '看板视图', icon: Columns }
  ];

  const categoryFilters = [
    { id: 'all', label: '全部任务', count: tasks.length },
    { id: 'work', label: '工作任务', count: tasks.filter(t => t.category === 'work').length },
    { id: 'study', label: '学习任务', count: tasks.filter(t => t.category === 'study').length },
    { id: 'health', label: '健康任务', count: tasks.filter(t => t.category === 'health').length },
    { id: 'life', label: '生活任务', count: tasks.filter(t => t.category === 'life').length }
  ];

  const healthReminders = [
    { 
      id: 'water', 
      label: '喝水提醒', 
      icon: Coffee, 
      enabled: aiConfig.healthReminders.waterReminder,
      interval: aiConfig.healthReminders.waterInterval
    },
    { 
      id: 'stand', 
      label: '站立提醒', 
      icon: Zap, 
      enabled: aiConfig.healthReminders.standReminder,
      interval: aiConfig.healthReminders.standInterval
    },
    { 
      id: 'eye', 
      label: '眼睛休息', 
      icon: Eye, 
      enabled: aiConfig.healthReminders.eyeRestReminder,
      interval: aiConfig.healthReminders.eyeRestInterval
    }
  ];

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 bg-gray-50/50 border-r border-gray-200 flex flex-col h-full">
      {/* 视图切换 */}
      <div className="p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">视图模式</h3>
        <div className="space-y-1">
          {viewOptions.map(option => {
            const Icon = option.icon;
            const isSelected = selectedView === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedView(option.id as any)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-white text-gray-900 shadow-sm font-medium ring-1 ring-gray-200'
                    : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-4" />

      {/* 快速筛选 */}
      <div className="p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
          <span>快速筛选</span>
        </h3>
        <div className="space-y-1">
          {categoryFilters.map(filter => {
            const isSelected = selectedCategory === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedCategory(filter.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-gray-200 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{filter.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-4" />

      {/* 健康提醒 */}
      <div className="p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">健康提醒</h3>
        <div className="space-y-3 px-1">
          {healthReminders.map(reminder => {
            const Icon = reminder.icon;
            return (
              <div key={reminder.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-md transition-colors ${reminder.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-gray-600 font-medium">{reminder.label}</span>
                </div>
                <button
                  onClick={() => toggleHealthReminders(reminder.id as any)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                    reminder.enabled ? 'bg-black' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      reminder.enabled ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                    style={{ transform: reminder.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      {/* 今日概览 */}
      <div className="p-4 m-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">今日概览</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {completedTodayTasks.length}<span className="text-gray-300 text-xl font-normal">/</span><span className="text-xl text-gray-400 font-normal">{todayTasks.length}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 font-medium">已完成任务</div>
            </div>
            <div className="h-10 w-10">
              <svg className="transform -rotate-90 w-full h-full">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-gray-100"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={100}
                  strokeDashoffset={100 - (completedTodayTasks.length / (todayTasks.length || 1)) * 100}
                  className="text-black transition-all duration-1000 ease-out"
                />
              </svg>
            </div>
          </div>
          
          {todayTasks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-50">
              {todayTasks.slice(0, 2).map(task => (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in-progress' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}
                  />
                  <span className={`truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;