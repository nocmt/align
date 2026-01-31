/**
 * Align 智能周计划应用 - 核心类型定义
 * 定义了任务、AI配置、工作作息等核心数据结构
 */

// 任务优先级类型
export type TaskPriority = 'urgent-important' | 'urgent-unimportant' | 'important-not-urgent' | 'not-important-not-urgent';

// 任务状态类型
export type TaskStatus = 'planning' | 'not-started' | 'in-progress' | 'paused' | 'completed' | 'cancelled';

// 任务类别类型
export type TaskCategory = 'work' | 'study' | 'health' | 'life' | 'other';

// 视图类型
export type ViewType = 'week' | 'day' | 'list' | 'kanban';

/**
 * 子任务数据结构
 */
export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedDuration: number; // 分钟
  actualDuration?: number; // 实际用时（分钟）
  order: number;
}

/**
 * 主任务数据结构
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  estimatedDuration: number; // 分钟
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  parentId?: string; // 子任务关联
  subtasks: SubTask[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  actualDuration?: number; // 实际用时（分钟）
  aiSuggested?: boolean; // 是否为AI建议
  reminderMinutes?: number; // 提前N分钟提醒
}

/**
 * AI功能开关配置
 */
export interface AIEnabledFeatures {
  naturalLanguageParse: boolean;
  timeEstimation: boolean;
  autoSchedule: boolean;
  dailySuggestion: boolean;
  progressAnalysis: boolean;
}

/**
 * 健康提醒配置
 */
export interface HealthReminders {
  waterReminder: boolean;
  waterInterval: number; // 分钟
  standReminder: boolean;
  standInterval: number; // 分钟
  eyeRestReminder: boolean;
  eyeRestInterval: number; // 分钟
}

/**
 * AI配置数据结构
 */
export interface AIConfig {
  id: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  enabledFeatures: AIEnabledFeatures;
  healthReminders: HealthReminders;
}

/**
 * WebDAV配置
 */
export interface WebDAVConfig {
  url: string;
  username: string;
  password?: string; // 可选，因为可能不持久化存储密码，或者加密存储
}

/**
 * WebDAV 同步状态
 */
export interface WebDAVSyncState extends WebDAVConfig {
  lastSyncTime?: Date | null;
  dirtyMonths?: string[];
}

/**
 * 时间段配置
 */
export interface TimeSlot {
  startTime: string; // HH:mm格式
  endTime: string; // HH:mm格式
  date?: string; // 特定日期，不填则为每天
}

/**
 * 假期配置
 */
export interface Holiday {
  name: string;
  startDate: string;
  endDate: string;
  isWorkDay: boolean; // 调休工作日
}

/**
 * 工作作息配置
 */
export interface WorkSchedule {
  id: string,
  workDays: number[]; // 0-6，周日到周六
  workStartTime: string; // HH:mm格式
  workEndTime: string; // HH:mm格式
  lunchStartTime: string;
  lunchEndTime: string;
  excludedTimeSlots: TimeSlot[];
  holidays: Holiday[];
}

/**
 * 数据分析数据结构
 */
export interface AnalyticsData {
  id: string;
  date: string;
  type: 'daily' | 'weekly' | 'monthly';
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  totalEstimatedTime: number;
  totalActualTime: number;
  priorityDistribution: Record<TaskPriority, number>;
  categoryDistribution: Record<TaskCategory, number>;
}

/**
 * 模板数据结构
 */
export interface Template {
  id: string;
  name: string;
  type: 'daily' | 'weekly';
  tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  createdAt: Date;
}

/**
 * AI请求数据结构
 */
export interface AIRequest {
  prompt: string;
  context?: {
    tasks: Task[];
    schedule: WorkSchedule;
    history: AnalyticsData[];
  };
  feature: 'parse' | 'estimate' | 'schedule' | 'suggest' | 'analyze' | 'parse_holidays';
}

/**
 * AI响应数据结构
 */
export interface AIResponse {
  success: boolean;
  data?: {
    parsedTask?: Partial<Task>;
    timeEstimate?: number;
    suggestedSchedule?: Task[];
    dailySuggestion?: string;
    progressAnalysis?: AnalyticsData;
    parsedHolidays?: { name: string; startDate: string; endDate: string; isWorkDay: boolean }[];
  };
  error?: string;
}

/**
 * 模态框状态
 */
export interface ModalState {
  isOpen: boolean;
  type: 'task' | 'create_task' | 'ai-config' | 'settings' | null;
  data?: any;
}

/**
 * 应用状态数据结构
 */
export interface AppState {
  tasks: Task[];
  currentWeek: Date;
  selectedView: ViewType;
  selectedCategory: TaskCategory | 'all';
  aiConfig: AIConfig;
  isAIProcessing: boolean;
  
  // WebDAV
  webdavConfig: WebDAVConfig | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  dirtyMonths: string[]; // YYYY-MM format, tracks months that need syncing
  
  // UI State
  isInitialized: boolean;
  sidebarOpen: boolean;
  modalState: ModalState;
  
  // New Features
  workSchedule: WorkSchedule;
  analytics: AnalyticsData[];
  templates: Template[];
  taskModalOpen: boolean;
}

/**
 * 优先级配置映射
 */
export const PRIORITY_CONFIG = {
  'urgent-important': {
    label: '紧急+重要',
    color: 'border-black bg-gray-900',
    textColor: 'text-white',
    borderColor: 'border-black'
  },
  'urgent-unimportant': {
    label: '紧急+不重要',
    color: 'border-gray-400 bg-gray-100',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-400'
  },
  'important-not-urgent': {
    label: '重要+不紧急',
    color: 'border-gray-300 bg-white',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300'
  },
  'not-important-not-urgent': {
    label: '不重要+不紧急',
    color: 'border-gray-200 bg-white',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200'
  }
} as const;

/**
 * 状态配置映射
 */
export const STATUS_CONFIG = {
  'planning': { label: '规划中', color: 'bg-gray-100 text-gray-500' },
  'not-started': { label: '未开始', color: 'bg-white border border-gray-200 text-gray-700' },
  'in-progress': { label: '进行中', color: 'bg-black text-white' },
  'paused': { label: '暂停中', color: 'bg-gray-200 text-gray-700' },
  'completed': { label: '已完成', color: 'bg-gray-800 text-white' },
  'cancelled': { label: '已取消', color: 'bg-gray-100 text-gray-400 line-through' }
} as const;

/**
 * 类别配置映射
 */
export const CATEGORY_CONFIG = {
  'work': { label: '工作', color: 'bg-gray-100 text-gray-900' },
  'study': { label: '学习', color: 'bg-gray-100 text-gray-900' },
  'health': { label: '健康', color: 'bg-gray-100 text-gray-900' },
  'life': { label: '生活', color: 'bg-gray-100 text-gray-900' },
  'other': { label: '其他', color: 'bg-gray-100 text-gray-900' }
} as const;