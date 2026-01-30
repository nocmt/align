import React from 'react';
import { 
  Calendar, 
  List, 
  Sun, 
  Plus,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAppStore } from '../../store';
import { useNavigate } from 'react-router-dom';

/**
 * 底部导航栏组件 - 仅在移动端显示
 * 提供核心功能入口：日视图、周视图、列表视图、数据分析
 */
const BottomNav: React.FC = () => {
  const { selectedView, setSelectedView, openModal } = useAppStore();
  const navigate = useNavigate();

  const navItems = [
    { id: 'day', label: '今天', icon: Sun },
    { id: 'week', label: '本周', icon: Calendar },
    { id: 'add', label: '添加', icon: Plus, isAction: true },
    { id: 'list', label: '列表', icon: List },
    { id: 'analytics', label: '分析', icon: BarChart3, path: '/analytics' }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isAction) {
      openModal('create_task', { startTime: new Date() });
      return;
    }

    if (item.path) {
      navigate(item.path);
      return;
    }

    if (item.id) {
      setSelectedView(item.id as any);
      navigate('/');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-safe z-40">
      <div className="flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isAction && !item.path && selectedView === item.id;
          const isAnalytics = item.path === '/analytics' && window.location.pathname === '/analytics';

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className="flex flex-col items-center justify-center -mt-8"
              >
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] mt-1 font-medium text-gray-500">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`flex flex-col items-center justify-center space-y-1 w-12 py-1 transition-colors ${
                isActive || isAnalytics ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive || isAnalytics ? 'fill-current' : ''}`} strokeWidth={isActive || isAnalytics ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;