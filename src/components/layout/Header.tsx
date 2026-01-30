import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Settings, BarChart3, Brain } from 'lucide-react';
import { useAppStore } from '../../store';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import TaskModal from '../task/TaskModal';

interface HeaderProps {
  currentTime: Date;
}

/**
 * 顶部导航栏组件
 * 显示应用标题、当前时间、快速操作按钮
 */
const Header: React.FC<HeaderProps> = ({ currentTime }) => {
  const navigate = useNavigate();
  const { 
    toggleSidebar, 
    currentWeek, 
    navigateWeek,
    modalState,
    openModal,
    closeModal
  } = useAppStore();

  const weekStart = new Date(currentWeek);
  const weekEnd = new Date(currentWeek);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：菜单和应用信息 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900">Align</h1>
            <span className="text-sm text-gray-500">
              {format(currentTime, 'MM月dd日 EEEE', { locale: zhCN })}
            </span>
          </div>
        </div>

        {/* 中间：周导航 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            ←
          </button>
          
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {format(weekStart, 'MM/dd')} - {format(weekEnd, 'MM/dd')}
            </div>
            <div className="text-xs text-gray-500">
              {format(currentTime, 'HH:mm')}
            </div>
          </div>
          
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            →
          </button>
        </div>

        {/* 右侧：快速操作 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openModal('create_task', { startTime: new Date() })}
            className="flex items-center space-x-2 px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">添加任务</span>
          </button>
          
          <button
            onClick={() => navigate('/ai-config')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            title="AI配置"
          >
            <Brain className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => navigate('/analytics')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            title="数据分析"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 任务模态框 */}
      {(modalState.isOpen && (modalState.type === 'task' || modalState.type === 'create_task')) && (
        <TaskModal
          task={modalState.type === 'task' ? modalState.data : undefined}
          defaultDate={modalState.data?.startTime ? new Date(modalState.data.startTime) : new Date()}
          onClose={closeModal}
          onSave={() => closeModal()}
        />
      )}
    </header>
  );
};

export default Header;