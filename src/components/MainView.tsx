/**
 * 主视图容器
 * 根据选中的视图模式渲染对应的组件
 */

import React from 'react';
import { useAppStore } from '@/store';
import WeekView from './week-view/WeekView';
import ListView from './list-view/ListView';
import KanbanView from './kanban-view/KanbanView';

const MainView: React.FC = () => {
  const { selectedView } = useAppStore();

  switch (selectedView) {
    case 'week':
      return <WeekView />;
    case 'list':
      return <ListView />;
    case 'kanban':
      return <KanbanView />;
    case 'day':
      // 复用周视图，周视图组件内部会处理 day 模式
      return <WeekView />;
    default:
      return <ListView />;
  }
};

export default MainView;
