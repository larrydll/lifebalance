import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthScreenProps {
    onSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('请填写邮箱和密码');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }

        if (password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const result = await signIn(email, password);
                if (result.error) {
                    setError(result.error);
                } else {
                    onSuccess();
                }
            } else {
                const result = await signUp(email, password);
                if (result.error) {
                    setError(result.error);
                } else {
                    onSuccess();
                }
            }
        } catch (err) {
            setError('操作失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto min-h-screen bg-background-dark flex flex-col">
            {/* Header */}
            <div className="px-6 pt-16 pb-8 text-center">
                <div className="inline-flex items-center justify-center size-20 bg-gradient-to-br from-primary/20 to-accent-cyan/20 rounded-3xl mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary">psychology</span>
                </div>
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent-cyan to-accent-pink">
                    生命轮成长助手
                </h1>
                <p className="text-gray-400 mt-2">
                    {isLogin ? '登录账户，继续你的成长之旅' : '创建账户，开启全新体验'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">邮箱地址</label>
                    <input
                        type="email"
                        placeholder="your@email.com"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:border-primary outline-none transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-gray-500 uppercase px-1">密码</label>
                    <input
                        type="password"
                        placeholder="••••••••"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:border-primary outline-none transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {!isLogin && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase px-1">确认密码</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:border-primary outline-none transition-all"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">error</span>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-primary text-background-dark rounded-xl font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            处理中...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">{isLogin ? 'login' : 'person_add'}</span>
                            {isLogin ? '登录' : '注册'}
                        </>
                    )}
                </button>

                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-gray-500 text-xs">或者</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="w-full h-12 bg-white/5 border border-white/10 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                    {isLogin ? (
                        <>
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            还没有账户？立即注册
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-lg">login</span>
                            已有账户？立即登录
                        </>
                    )}
                </button>

                {/* Skip login for demo */}
                <div className="mt-auto pb-10 pt-8 text-center">
                    <button
                        type="button"
                        onClick={onSuccess}
                        className="text-gray-500 text-sm underline decoration-dashed underline-offset-4 hover:text-gray-300 transition-colors"
                    >
                        跳过登录，仅体验功能
                    </button>
                    <p className="text-[10px] text-gray-600 mt-2">（跳过登录后数据将不会保存）</p>
                </div>
            </form>
        </div>
    );
};

export default AuthScreen;
