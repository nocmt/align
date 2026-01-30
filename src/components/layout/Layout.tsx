import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAppStore } from '../../store';
import { useState } from 'react';

/**
 * 应用布局组件
 * 提供顶部导航栏、侧边栏、底部导航栏(移动端)和主内容区域
 */
const Layout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, openSidebar } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 移动端默认关闭侧边栏
  React.useEffect(() => {
    if (window.innerWidth > 769) {
      openSidebar();
    }
  }, []);

  // 更新时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 - 桌面端显示 */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 顶部导航栏 */}
        <Header currentTime={currentTime} />
        
        {/* 主内容 - 底部增加 padding 防止被 BottomNav 遮挡 */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* 底部导航栏 - 移动端显示 */}
      <BottomNav />
      
      {/* 移动端侧边栏遮罩 - 仅在 SidebarOpen 时显示 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        >
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl animate-in slide-in-from-left duration-200">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;