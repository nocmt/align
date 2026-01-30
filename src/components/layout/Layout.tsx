import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppStore } from '../../store';
import { useState } from 'react';

/**
 * 应用布局组件
 * 提供顶部导航栏、侧边栏和主内容区域
 */
const Layout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 更新时间
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <Header currentTime={currentTime} />
        
        {/* 主内容 */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default Layout;