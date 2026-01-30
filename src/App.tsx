import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import MainView from './components/MainView';
import TaskDetail from './pages/TaskDetail';
import AIConfig from './pages/AIConfig';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { useAppStore } from './store';
import { useEffect } from 'react';

/**
 * 主应用组件
 * 提供路由配置、拖拽支持和全局状态初始化
 */
function App() {
  const { initializeStore } = useAppStore();

  // 初始化存储
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <div className="min-h-screen bg-white text-gray-900">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<MainView />} />
              <Route path="task/:id" element={<TaskDetail />} />
              <Route path="ai-config" element={<AIConfig />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-white border border-gray-200 shadow-lg',
              style: {
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '1px solid #e2e8f0'
              }
            }}
          />
        </div>
      </Router>
    </DndProvider>
  );
}

export default App;