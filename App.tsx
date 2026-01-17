
import React, { useState, useEffect } from 'react';
import { Dimension, AppView, ActionPlanItem, DailyHabit } from './types';
import { DIMENSIONS_INITIAL } from './constants';
import Navigation from './components/Navigation';
import RadarChart from './components/RadarChart';
import AuthScreen from './components/AuthScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { generateActionPlan } from './services/geminiService';
import { saveAssessment, loadAssessment } from './services/assessmentService';
import { savePlan, loadPlan } from './services/planService';
import { saveHabits, loadHabits, toggleHabitCompletion, calculateStreak } from './services/habitService';
import { submitSupportRequest } from './services/supportService';

const AppContent: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<AppView>('SPLASH');
  const [dimensions, setDimensions] = useState<Dimension[]>(DIMENSIONS_INITIAL);
  const [plan, setPlan] = useState<ActionPlanItem[]>([]);
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Support Form State
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');

  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (user && !dataLoaded) {
        setIsLoading(true);
        try {
          // Load assessment
          const { dimensions: savedDimensions } = await loadAssessment();
          if (savedDimensions) {
            setDimensions(savedDimensions);
          }

          // Load plan
          const { plan: savedPlan } = await loadPlan();
          if (savedPlan.length > 0) {
            setPlan(savedPlan);
          }

          // Load habits
          const { habits: savedHabits } = await loadHabits();
          if (savedHabits.length > 0) {
            setHabits(savedHabits);
          }

          // Calculate streak
          const { streak: userStreak } = await calculateStreak();
          setStreak(userStreak);

          setDataLoaded(true);
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadUserData();
  }, [user, dataLoaded]);

  // Derive habits from generated plan
  useEffect(() => {
    if (plan.length > 0 && habits.length === 0) {
      const newHabits: DailyHabit[] = plan.flatMap(p =>
        p.tasks.slice(0, 1).map(task => ({
          id: `habit-${p.id}`,
          title: task,
          subtitle: `专注于: ${p.category}缺口`,
          icon: dimensions.find(d => d.name === p.category)?.icon || 'bolt',
          completed: false,
          category: p.category,
          colorClass: dimensions.find(d => d.name === p.category)?.colorClass || 'bg-primary/10 text-primary'
        }))
      );
      setHabits(newHabits);

      // Save habits to database if user is authenticated
      if (user) {
        saveHabits(newHabits);
      }
    }
  }, [plan, dimensions, habits.length, user]);

  // Save assessment when leaving goals view
  const handleSaveAssessment = async () => {
    if (user) {
      await saveAssessment(dimensions);
    }
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setView('RADAR_RESULT');

    // Save assessment first
    await handleSaveAssessment();

    try {
      const result = await generateActionPlan(dimensions);
      setPlan(result);

      // Save plan to database
      if (user) {
        await savePlan(result);
      }

      setView('ACTION_PLAN');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentScore = (id: string, score: number) => {
    setDimensions(prev => prev.map(d => d.id === id ? { ...d, currentScore: score } : d));
  };

  const updateTargetScore = (id: string, score: number) => {
    setDimensions(prev => prev.map(d => d.id === id ? { ...d, targetScore: score } : d));
  };

  const handleToggleHabit = async (id: string) => {
    // Update local state immediately for responsiveness
    setHabits(prev => prev.map(h => h.id === id ? { ...h, completed: !h.completed } : h));

    // Sync with database
    if (user) {
      await toggleHabitCompletion(id);
      // Recalculate streak
      const { streak: newStreak } = await calculateStreak();
      setStreak(newStreak);
    }
  };

  const handleSendSupport = async () => {
    if (!message.trim()) {
      alert('请输入您的问题内容');
      return;
    }

    // Save to database
    const { success } = await submitSupportRequest(contact, message);

    if (success) {
      // Also send email
      const subject = encodeURIComponent('生命轮成长助手：人工咨询');
      const body = encodeURIComponent(`联系方式: ${contact}\n\n咨询内容:\n${message}`);
      window.location.href = `mailto:larrydll@163.com?subject=${subject}&body=${body}`;

      // Clear form
      setContact('');
      setMessage('');
    } else {
      // Fallback to email only
      const subject = encodeURIComponent('生命轮成长助手：人工咨询');
      const body = encodeURIComponent(`联系方式: ${contact}\n\n咨询内容:\n${message}`);
      window.location.href = `mailto:larrydll@163.com?subject=${subject}&body=${body}`;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setView('SPLASH');
    setDataLoaded(false);
    setDimensions(DIMENSIONS_INITIAL);
    setPlan([]);
    setHabits([]);
    setStreak(0);
  };

  const handleAuthSuccess = () => {
    setView('SPLASH');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  // Views rendering
  const renderSplash = () => (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto pb-24 bg-deep-indigo font-display">
      <div className="px-4 py-8">
        <div className="relative flex flex-col justify-end overflow-hidden rounded-[2rem] min-h-[420px] shadow-2xl"
          style={{ backgroundImage: 'radial-gradient(circle at top right, rgba(0, 240, 255, 0.2) 0%, rgba(79, 70, 229, 0.1) 50%, #0F0C29 100%), url("https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&q=80&w=1000")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="relative z-10 p-8 bg-gradient-to-t from-deep-indigo via-deep-indigo/40 to-transparent">
            <span className="text-accent-cyan font-bold tracking-widest text-xs mb-2 uppercase">Your Personal Evolution</span>
            <p className="text-white tracking-tight text-[40px] font-extrabold leading-[1.1]">
              重塑你的<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-cyan via-white to-accent-pink">平衡人生</span>
            </p>
          </div>
        </div>
      </div>

      {/* User status bar */}
      {user && (
        <div className="px-6 mb-4">
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{user.email}</p>
                <p className="text-xs text-gray-500">已登录 • 连续{streak}天</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      )}

      <div className="px-6 pt-4">
        <h3 className="text-white text-2xl font-black">探索无限可能</h3>
        <p className="text-slate-400 text-base mt-2">通过科学的生命轮评估，打破边界，迈向你渴望的每一个未来。</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 mt-8">
        {[
          { icon: 'insights', title: '评估现状', desc: '诊断10个维度现状', color: 'accent-cyan' },
          { icon: 'auto_graph', title: '预见未来', desc: '设定1年理想目标', color: 'accent-pink' },
          { icon: 'bolt', title: '行动方案', desc: 'AI生成针对性策略', color: 'primary' },
          { icon: 'track_changes', title: '每日打卡', desc: '将长期目标落实', color: 'blue-500' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-3xl flex flex-col gap-4 transform transition-all active:scale-95">
            <span className={`material-symbols-outlined text-2xl text-${item.color}`}>{item.icon}</span>
            <div>
              <h2 className="text-white text-lg font-bold">{item.title}</h2>
              <p className="text-slate-400 text-xs">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-6 left-0 right-0 max-w-md mx-auto px-6 space-y-3">
        <button
          onClick={() => user ? setView('ASSESSMENT') : setView('AUTH')}
          className="w-full h-16 rounded-2xl bg-white text-deep-indigo text-lg font-black shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {user ? '开启之旅' : '登录/注册'} <span className="material-symbols-outlined">arrow_forward_ios</span>
        </button>
        {!user && (
          <button
            onClick={() => setView('ASSESSMENT')}
            className="w-full h-12 rounded-xl bg-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            跳过登录，仅体验功能
          </button>
        )}
      </div>
    </div>
  );

  const renderAuth = () => (
    <AuthScreen onSuccess={handleAuthSuccess} />
  );

  const renderAssessment = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => setView('SPLASH')} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="text-lg font-bold">生命指标评估</h2>
        <div className="size-10"></div>
      </header>
      <div className="px-6 pt-8 pb-4 text-center">
        <h3 className="text-3xl font-extrabold">评估你的现状</h3>
        <p className="text-gray-400 mt-2">为每个维度打分（0-10）</p>
      </div>
      <div className="px-2 space-y-1">
        {dimensions.map(d => (
          <div key={d.id} className="p-4 rounded-2xl active:bg-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`size-10 flex items-center justify-center rounded-xl ${d.colorClass}`}>
                  <span className="material-symbols-outlined">{d.icon}</span>
                </div>
                <p className="text-lg font-semibold">{d.name}</p>
              </div>
              <p className="text-primary text-lg font-bold">{d.currentScore}/10</p>
            </div>
            <input
              type="range" min="0" max="10"
              value={d.currentScore}
              onChange={(e) => updateCurrentScore(d.id, parseInt(e.target.value))}
            />
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 max-w-md mx-auto">
        <button
          onClick={() => setView('GOALS')}
          className="w-full bg-primary text-background-dark py-4 rounded-xl text-lg font-extrabold shadow-lg active:scale-95 transition-all"
        >
          下一步：设定理想目标
        </button>
      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => setView('ASSESSMENT')} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="text-lg font-bold">设定目标</h2>
        <div className="size-10"></div>
      </header>
      <div className="px-6 pt-8 pb-4 text-center">
        <h3 className="text-3xl font-extrabold">一年后的理想</h3>
        <p className="text-gray-400 mt-2">你希望达到的状态是多少分？</p>
      </div>
      <div className="px-4 space-y-3">
        {dimensions.map(d => (
          <div key={d.id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`size-10 flex items-center justify-center rounded-xl ${d.colorClass}`}>
                  <span className="material-symbols-outlined">{d.icon}</span>
                </div>
                <p className="text-lg font-semibold">{d.name}</p>
              </div>
              <div className="text-right">
                <p className="text-primary text-xl font-bold">{d.targetScore}/10</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">目标</p>
              </div>
            </div>
            <input
              type="range" min="0" max="10"
              value={d.targetScore}
              onChange={(e) => updateTargetScore(d.id, parseInt(e.target.value))}
            />
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-gray-400">当前: <span className="text-white font-bold">{d.currentScore}/10</span></span>
              <span className="text-primary font-bold">+{d.targetScore - d.currentScore} 分</span>
            </div>
          </div>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 max-w-md mx-auto">
        <button
          onClick={handleGeneratePlan}
          className="w-full bg-primary text-background-dark py-4 rounded-xl text-lg font-extrabold shadow-lg active:scale-95 transition-all"
        >
          {isLoading ? 'AI 正在生成计划...' : '生成我的生命轮对比'}
        </button>
      </div>
    </div>
  );

  const renderRadarResult = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32 overflow-y-auto no-scrollbar">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between">
        <button onClick={() => setView('GOALS')} className="size-10 flex items-center justify-center bg-white/10 rounded-full"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="text-lg font-bold">生命轮对比</h2>
        <button className="size-10 flex items-center justify-center bg-white/10 rounded-full"><span className="material-symbols-outlined">share</span></button>
      </header>
      <main className="px-6">
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary"></span><span className="text-[10px] font-bold text-gray-400 uppercase">现状</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-[#f59e0b] border-dashed"></span><span className="text-[10px] font-bold text-gray-400 uppercase">目标</span></div>
        </div>

        <div className="relative mt-20 mb-24 flex items-center justify-center">
          <RadarChart dimensions={dimensions} size={220} />
          {/* Labels positioning logic */}
          <div className="absolute inset-0 pointer-events-none">
            {dimensions.map((d, i) => {
              const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2;
              const dist = 145;
              const x = 110 + dist * Math.cos(angle);
              const y = 110 + dist * Math.sin(angle);
              return (
                <div key={d.id} className="absolute text-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                  <p className="text-[10px] font-bold text-gray-500">{d.name}</p>
                  <p className="text-xs font-bold">{d.currentScore} <span className="text-accent-orange mx-0.5">→</span> {d.targetScore}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 pt-6 border-t border-white/10">
            <h2 className="text-lg font-bold">重点差距领域</h2>
            <span className="text-[10px] text-accent-orange font-bold px-2 py-1 bg-accent-orange/10 rounded-lg">高影响力</span>
          </div>
          <div className="space-y-3">
            {dimensions
              .map(d => ({ ...d, gap: d.targetScore - d.currentScore }))
              .sort((a, b) => b.gap - a.gap)
              .slice(0, 3)
              .map(d => (
                <div key={d.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl ${d.colorClass}`}>
                    <span className="material-symbols-outlined">{d.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{d.name}</h3>
                    <p className="text-[11px] text-gray-400">{d.gap >= 5 ? '差距最大的项' : '成长核心项'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-accent-orange">+{d.gap} 分</p>
                    <p className="text-[10px] text-gray-500">{d.currentScore} → {d.targetScore}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  );

  const renderActionPlan = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => setView('RADAR_RESULT')} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined text-xl">arrow_back_ios</span></button>
        <h2 className="text-lg font-bold">年度行动计划</h2>
        <button className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">share</span></button>
      </header>
      <div className="px-4 pt-6">
        <h3 className="text-xl font-extrabold">核心关注领域</h3>
        <p className="text-emerald-400 text-sm mt-1">基于您的生命之轮评估</p>
      </div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {plan.map(p => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-emerald-900/50 bg-[#193322] p-3 items-center text-center">
            <span className="material-symbols-outlined text-primary">{dimensions.find(d => d.name === p.category)?.icon || 'auto_awesome'}</span>
            <h2 className="text-xs font-bold">{p.category}</h2>
          </div>
        ))}
      </div>
      <div className="px-4 pt-4"><h3 className="text-lg font-bold">成长策略</h3></div>
      <div className="space-y-4 p-4">
        {plan.map((p, idx) => (
          <div key={p.id} className="flex flex-col rounded-xl overflow-hidden bg-[#193322] border border-emerald-900/50 shadow-xl">
            <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url(${p.imageUrl})` }}></div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-primary text-xs font-bold uppercase">优先级 {idx + 1}</p>
                  <p className="text-xl font-extrabold">{p.title}</p>
                </div>
                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold">
                  {p.status === 'critical' ? '关键' : p.status === 'steady' ? '稳步' : '适度'}
                </span>
              </div>
              <ul className="space-y-3">
                {p.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                    <p className="text-emerald-200 text-sm font-medium">{task}</p>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setView('DAILY_TRACK')}
                className="w-full h-12 rounded-lg bg-primary text-background-dark font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">calendar_add_on</span> 加入日程
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyTrack = () => (
    <div className="max-w-[430px] mx-auto min-h-screen bg-background-dark flex flex-col pb-32">
      <header className="flex items-center p-4 justify-between sticky top-0 z-50 bg-background-dark">
        <div className="size-10 rounded-full border-2 border-primary/20 bg-cover bg-center" style={{ backgroundImage: 'url("https://picsum.photos/100/100")' }}></div>
        <div className="flex-1 px-3">
          <h2 className="text-lg font-bold">每日打卡</h2>
          <p className="text-xs text-gray-500">成长思维计划</p>
        </div>
        <button className="size-10 rounded-full bg-white/10 flex items-center justify-center"><span className="material-symbols-outlined">notifications</span></button>
      </header>

      <div className="px-4 py-4 flex gap-3 overflow-x-auto no-scrollbar">
        {[12, 13, 14, 15, 16, 17, 18].map((day, idx) => {
          const isToday = day === 15;
          const label = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx];
          return (
            <div key={day} className={`flex flex-col items-center justify-center min-w-[52px] h-20 rounded-2xl ${isToday ? 'bg-primary text-background-dark' : 'bg-white/5 opacity-60'}`}>
              <p className="text-[10px] font-bold uppercase mb-1">{label}</p>
              <p className="text-lg font-bold">{day}</p>
              {isToday && <div className="size-1 bg-background-dark rounded-full mt-1"></div>}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-lg font-bold">今日重点</h3>
        <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded-full">{habits.length}个关注领域</span>
      </div>

      <div className="px-4 space-y-3">
        {habits.length > 0 ? habits.map(h => (
          <div key={h.id} className={`flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 ${h.completed ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`size-10 flex items-center justify-center rounded-xl ${h.colorClass}`}>
                <span className="material-symbols-outlined">{h.icon}</span>
              </div>
              <div>
                <p className={`font-semibold ${h.completed ? 'line-through' : ''}`}>{h.title}</p>
                <p className="text-xs text-gray-500">{h.subtitle}</p>
              </div>
            </div>
            <label className="relative flex cursor-pointer items-center p-2">
              <input
                type="checkbox"
                checked={h.completed}
                onChange={() => handleToggleHabit(h.id)}
                className="peer h-6 w-6 appearance-none rounded-full border-2 border-gray-600 checked:bg-primary checked:border-primary transition-all"
              />
              <span className="absolute text-background-dark opacity-0 peer-checked:opacity-100 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <span className="material-symbols-outlined text-sm font-bold">check</span>
              </span>
            </label>
          </div>
        )) : (
          <div className="text-center py-10 text-gray-500">
            <p>还没有制定计划，快去生成吧！</p>
          </div>
        )}
      </div>

      <div className="px-4 mt-8">
        <h3 className="text-lg font-bold mb-4">进度洞察</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: '每周', percent: 86, text: '18/21 项任务' },
            { label: '每月', percent: 83, text: '75/90 项任务' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-3xl flex flex-col items-center justify-between h-44">
              <p className="text-xs font-bold text-gray-500 uppercase">{item.label}</p>
              <div className="relative flex items-center justify-center">
                <svg className="size-20">
                  <circle cx="40" cy="40" r="34" className="text-white/10" fill="transparent" stroke="currentColor" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" className="text-primary" fill="transparent" stroke="currentColor" strokeWidth="6"
                    strokeDasharray="213.6" strokeDashoffset={213.6 * (1 - item.percent / 100)} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="absolute text-lg font-extrabold">{item.percent}%</span>
              </div>
              <p className="text-sm font-semibold">{item.text.split(' ')[0]} <span className="text-gray-500 font-normal">项任务</span></p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 mb-10">
        <div className="bg-gradient-to-r from-primary to-[#10d452] p-6 rounded-3xl flex items-center justify-between shadow-xl">
          <div className="flex-1 pr-4">
            <h4 className="text-background-dark font-extrabold text-lg">继续保持！</h4>
            <p className="text-background-dark/70 text-sm mt-1">你已连续打卡{streak}天。明天继续以获得奖励。</p>
          </div>
          <div className="size-12 flex items-center justify-center bg-background-dark rounded-2xl text-primary">
            <span className="material-symbols-outlined">local_fire_department</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => setView('DAILY_TRACK')} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="text-lg font-bold">成长进度</h2>
        <button className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">calendar_today</span></button>
      </header>
      <div className="px-4 pt-6">
        <h3 className="text-2xl font-bold">持续性评分</h3>
        <p className="text-emerald-400 text-sm">过去30天的平均完成率</p>
        <div className="flex items-baseline gap-2 mt-4">
          <p className="text-[42px] font-bold">82%</p>
          <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
            <p className="text-primary text-sm font-bold">+5%</p>
          </div>
        </div>
        {/* Placeholder Line Chart with SVG */}
        <div className="h-44 w-full mt-4 flex items-end overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 150">
            <path d="M0 120 C 50 80, 100 130, 150 70 S 250 20, 300 100 S 350 40, 400 80 V 150 H 0 Z" fill="url(#grad)" />
            <path d="M0 120 C 50 80, 100 130, 150 70 S 250 20, 300 100 S 350 40, 400 80" fill="transparent" stroke="#13ec5b" strokeWidth="3" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#13ec5b" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between px-2 text-[10px] font-bold text-gray-500 uppercase mt-2">
          <span>第1天</span><span>第15天</span><span>今天</span>
        </div>
      </div>

      <div className="px-4 mt-8 space-y-4">
        <h3 className="text-lg font-bold">核心领域</h3>
        {plan.map(p => {
          const dim = dimensions.find(d => d.name === p.category);
          return (
            <div key={p.id} className="flex items-stretch justify-between gap-4 rounded-xl bg-[#193322] p-4 shadow-sm border border-emerald-900/30">
              <div className="flex flex-col justify-between gap-4 flex-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">{dim?.icon || 'bolt'}</span>
                    <p className="font-bold">{p.category}</p>
                  </div>
                  <p className="text-emerald-400 text-sm">42% 月完成度</p>
                </div>
                <div className="w-full bg-emerald-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '42%' }}></div>
                </div>
                <button className="h-8 px-4 bg-emerald-900 text-white text-xs font-bold rounded-lg w-fit">查看详情</button>
              </div>
              <div className="w-24 h-24 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${p.imageUrl})` }}></div>
            </div>
          );
        })}
      </div>

      <div className="px-4 pt-6">
        <div className="bg-gradient-to-br from-primary to-[#0da741] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-20"><span className="material-symbols-outlined text-[120px]">local_fire_department</span></div>
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-white text-5xl mb-2">local_fire_department</span>
            <h4 className="text-white/80 text-sm font-bold uppercase tracking-widest">当前连续天数</h4>
            <p className="text-white text-6xl font-black my-1">{streak} 天</p>
            <p className="text-white/90 text-sm max-w-[280px]">令人惊叹的动力！本月你超过了5%的用户。</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="max-w-md mx-auto min-h-screen bg-background-dark pb-32">
      <header className="sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
        <button onClick={() => setView('DAILY_TRACK')} className="size-10 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back_ios_new</span></button>
        <h2 className="text-lg font-bold">人工咨询 & Q&A</h2>
        <div className="size-10"></div>
      </header>

      <div className="px-6 pt-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl">psychology</span>
          </div>
          <div>
            <h3 className="text-xl font-bold">遇到困惑了？</h3>
            <p className="text-gray-400 text-sm">我们会为您提供专业的人工回复</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <h4 className="font-bold text-sm text-primary mb-3 uppercase tracking-wider">常见问题指引</h4>
          <ul className="space-y-3">
            {['如何准确评估我的财务状况？', '平衡事业与家庭的3个关键习惯', '生命轮分数波动很大正常吗？'].map((q, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="size-1.5 bg-primary rounded-full"></span>
                {q}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">您的联系方式 (微信/手机/邮箱)</label>
            <input
              type="text"
              placeholder="以便我们回复您"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-primary outline-none transition-all"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">您的问题或成长困扰</label>
            <textarea
              rows={5}
              placeholder="描述您的疑问，我们将尽快给予建议..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:border-primary outline-none transition-all resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button
            onClick={handleSendSupport}
            className="w-full h-14 bg-primary text-background-dark rounded-xl font-black text-lg shadow-xl shadow-primary/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-all mt-4"
          >
            <span className="material-symbols-outlined">send</span> 提交咨询
          </button>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-2">或者直接发送邮件至：</p>
            <p className="text-primary font-bold">larrydll@163.com</p>
            <div className="mt-6 flex justify-center opacity-30">
              <span className="material-symbols-outlined text-4xl">volunteer_activism</span>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 px-8">您的隐私将受到保护，所有回复均为人工专业生活教练提供。</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-background-dark text-white min-h-screen">
      {view === 'SPLASH' && renderSplash()}
      {view === 'AUTH' && renderAuth()}
      {view === 'ASSESSMENT' && renderAssessment()}
      {view === 'GOALS' && renderGoals()}
      {view === 'RADAR_RESULT' && renderRadarResult()}
      {view === 'ACTION_PLAN' && renderActionPlan()}
      {view === 'DAILY_TRACK' && renderDailyTrack()}
      {view === 'PROGRESS' && renderProgress()}
      {view === 'SUPPORT' && renderSupport()}

      {view !== 'SPLASH' && view !== 'ASSESSMENT' && view !== 'GOALS' && view !== 'AUTH' && (
        <Navigation currentView={view} onNavigate={setView} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
