
import { Dimension } from './types';

export const DIMENSIONS_INITIAL: Dimension[] = [
  { id: 'health', name: '健康', icon: 'favorite', colorClass: 'bg-red-500/20 text-red-400', currentScore: 8, targetScore: 9 },
  { id: 'career', name: '事业', icon: 'work', colorClass: 'bg-blue-500/20 text-blue-400', currentScore: 7, targetScore: 10 },
  { id: 'finance', name: '财务', icon: 'payments', colorClass: 'bg-emerald-500/20 text-emerald-400', currentScore: 5, targetScore: 8 },
  { id: 'growth', name: '个人成长', icon: 'psychology', colorClass: 'bg-purple-500/20 text-purple-400', currentScore: 9, targetScore: 10 },
  { id: 'social', name: '人际关系', icon: 'groups', colorClass: 'bg-pink-500/20 text-pink-400', currentScore: 6, targetScore: 8 },
  { id: 'leisure', name: '娱乐休闲', icon: 'celebration', colorClass: 'bg-orange-500/20 text-orange-400', currentScore: 4, targetScore: 7 },
  { id: 'environment', name: '生活环境', icon: 'home_pin', colorClass: 'bg-teal-500/20 text-teal-400', currentScore: 8, targetScore: 9 },
  { id: 'spirit', name: '精神追求', icon: 'self_improvement', colorClass: 'bg-indigo-500/20 text-indigo-400', currentScore: 3, targetScore: 8 },
];
