/**
 * 任务卡片组件 - 显示单个任务的详细信息
 * 支持拖拽、状态显示、优先级标识
 */

import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { useAppStore } from '@/store';
import { Task, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Clock, 
  Edit3, 
  Trash2, 
  MoreVertical,
  CheckCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

/**
 * 任务卡片属性接口
 */
interface TaskCardProps {
  task: Task;
  style?: React.CSSProperties;
  compact?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

/**
 * 任务卡片组件
 */
const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  style, 
  compact = false,
  onEdit,
  onDelete,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect
}) => {
  const { updateTask, deleteTask, openModal } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 拖拽配置
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { 
      id: task.id,
      title: task.title,
      startTime: task.startTime,
      endTime: task.endTime,
      estimatedDuration: task.estimatedDuration
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // 获取优先级配置
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const statusConfig = STATUS_CONFIG[task.status];
  const categoryConfig = CATEGORY_CONFIG[task.category];

  // 格式化时间
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: zhCN });
  };

  // 计算任务时长
  const getDuration = () => {
    const duration = task.estimatedDuration;
    if (duration < 60) {
      return `${duration}分钟`;
    } else {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`;
    }
  };

  // 处理状态切换
  const handleStatusToggle = async () => {
    const statusOrder = ['planning', 'not-started', 'in-progress', 'paused', 'completed'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    await updateTask(task.id, { 
      status: nextStatus as Task['status'],
      completedAt: nextStatus === 'completed' ? new Date() : undefined
    });
  };

  // 处理编辑
  const handleEdit = () => {
    if (onEdit) {
      onEdit(task);
    } else {
      openModal('task', task);
    }
  };

  // 处理点击
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(e);
    } else {
      handleEdit();
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (confirm('确定要删除这个任务吗？')) {
      if (onDelete) {
        onDelete(task.id);
      } else {
        await deleteTask(task.id);
      }
    }
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (task.status) {
      case 'in-progress':
        return <PlayCircle className="w-4 h-4" />;
      case 'paused':
        return <PauseCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // 紧凑模式渲染
  if (compact) {
    return (
      <div
        ref={drag}
        className={`absolute p-1 rounded-md text-xs cursor-move transition-all duration-200 ${
          isDragging ? 'opacity-50 scale-95' : 'opacity-100'
        } ${priorityConfig.color} border-l-4 ${priorityConfig.borderColor} hover:shadow-md`}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleEdit}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {task.title}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" />
              <span>{formatTime(task.startTime)}</span>
            </div>
          </div>
          
          {isHovered && (
            <div className="flex items-center gap-1 ml-1">
              <button
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusToggle();
                }}
                title={statusConfig.label}
              >
                {getStatusIcon()}
              </button>
              <button
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                title="编辑任务"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* 悬停时显示完整信息 */}
        {isHovered && (
          <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 min-w-48">
            <div className="text-sm font-medium text-gray-900 mb-1">
              {task.title}
            </div>
            {task.description && (
              <div className="text-xs text-gray-600 mb-2">
                {task.description}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(task.startTime)} - {formatTime(task.endTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className={`px-2 py-1 rounded-full ${categoryConfig.color}`}>
                {categoryConfig.label}
              </span>
              <span className={`px-2 py-1 rounded-full ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              预估时长: {getDuration()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 完整模式渲染
  return (
    <div
      ref={drag}
      className={`relative p-3 rounded-lg border-2 cursor-move transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 hover:shadow-lg'
      } ${isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : `bg-white ${priorityConfig.borderColor}`}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* 选择按钮 - 仅在 selectionMode 为 true 时显示 */}
      {isSelectionMode && onToggleSelect && (
        <button 
          className="absolute top-3 left-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(e);
          }}
        >
          {isSelected ? (
            <CheckCircle className="w-5 h-5 text-blue-600 bg-white rounded-full" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white hover:border-blue-500 transition-colors" />
          )}
        </button>
      )}

      {/* 任务标题 */}
      <div className={`flex items-start justify-between mb-2 ${isSelectionMode ? 'pl-8' : ''}`}>
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-medium text-gray-900 truncate">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        
        {/* 操作菜单 */}
        <div className="relative ml-2">
          <button
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                  setShowMenu(false);
                }}
              >
                <Edit3 className="w-4 h-4" />
                编辑
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusToggle();
                  setShowMenu(false);
                }}
              >
                {getStatusIcon()}
                {statusConfig.label}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-900 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                  setShowMenu(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>删除</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 时间信息 */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Clock className="w-4 h-4" />
        <span>{formatTime(task.startTime)} - {formatTime(task.endTime)}</span>
        <span className="text-gray-400">•</span>
        <span>{getDuration()}</span>
      </div>

      {/* 标签 */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-1 rounded-full text-xs ${categoryConfig.color}`}>
          {categoryConfig.label}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* 进度条（如果任务有实际用时）*/}
      {task.actualDuration && task.estimatedDuration > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>进度</span>
            <span>{Math.round((task.actualDuration / task.estimatedDuration) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((task.actualDuration / task.estimatedDuration) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 子任务 */}
      {task.subtasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">
            子任务 ({task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length})
          </div>
          <div className="space-y-1">
            {task.subtasks.slice(0, 3).map((subtask, index) => (
              <div key={subtask.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  subtask.status === 'completed' ? 'bg-black' : 'bg-gray-300'
                }`} />
                <span className="text-gray-700 truncate">{subtask.title}</span>
              </div>
            ))}
            {task.subtasks.length > 3 && (
              <div className="text-xs text-gray-500">
                还有 {task.subtasks.length - 3} 个子任务...
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI建议标识 */}
      {task.aiSuggested && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            AI建议
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;