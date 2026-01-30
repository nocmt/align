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
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* 视图切换 */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-3">视图模式</h3>
        <div className="space-y-1">
          {viewOptions.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedView(option.id as any)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  selectedView === option.id
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 快速筛选 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-500">快速筛选</h3>
        </div>
        <div className="space-y-1">
          {categoryFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedCategory(filter.id as any)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedCategory === filter.id
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm">{filter.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                selectedCategory === filter.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 健康提醒 */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 mb-3">健康提醒</h3>
        <div className="space-y-2">
          {healthReminders.map(reminder => {
            const Icon = reminder.icon;
            return (
              <div key={reminder.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{reminder.label}</span>
                </div>
                <button
                  onClick={() => toggleHealthReminders(reminder.id as any)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    reminder.enabled ? 'bg-black' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      reminder.enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 今日概览 */}
      <div className="p-4 flex-1">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-500">今日概览</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {completedTodayTasks.length}/{todayTasks.length}
            </div>
            <div className="text-xs text-gray-500">已完成任务</div>
          </div>
          
          {todayTasks.slice(0, 3).map(task => (
            <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-gray-900' :
                    task.status === 'in-progress' ? 'bg-black' :
                    'bg-gray-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(task.startTime), 'HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;