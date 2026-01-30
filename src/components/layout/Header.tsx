import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Settings, BarChart3, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <header className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧：菜单和应用信息 */}
        <div className="flex items-center space-x-6">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Align</h1>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-sm text-gray-500 font-medium">
              {format(currentTime, 'M月d日 EEEE', { locale: zhCN })}
            </span>
          </div>
        </div>

        {/* 中间：周导航 */}
        <div className="flex items-center bg-gray-50 rounded-lg p-1">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="px-4 text-center min-w-[120px]">
            <div className="text-sm font-semibold text-gray-900">
              {format(weekStart, 'M/d')} - {format(weekEnd, 'M/d')}
            </div>
          </div>
          
          <button
            onClick={() => navigateWeek(1)}
            className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 右侧：快速操作 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => openModal('create_task', { startTime: new Date() })}
            className="flex items-center space-x-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-all shadow-sm hover:shadow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">新建任务</span>
          </button>
          
          <div className="h-6 w-px bg-gray-200 mx-2" />
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigate('/ai-config')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              title="AI配置"
            >
              <Brain className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/analytics')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              title="数据分析"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
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