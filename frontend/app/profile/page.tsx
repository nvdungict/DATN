'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, User as UserIcon } from 'lucide-react';
import { getMe, updateMe } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import FloatingCopilot from '@/components/FloatingCopilot';

function ProfileInner() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [fields, setFields] = useState({ name: '', phone: '' });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const data = await getMe() as any;
      setUser(data);
      setFields({
        name: data.travel_profile?.name || data.email?.split('@')[0] || '',
        phone: data.travel_profile?.phone || '',
      });
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const profileToSave = { ...user?.travel_profile, phone: fields.phone, name: fields.name };
      const updated = await updateMe(profileToSave);
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/login');
  }

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <nav className="border-b border-white/8 bg-black/20 backdrop-blur-xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="lg:hidden w-10" />
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 text-sm transition"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Page body */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Personal Profile</h1>
              <p className="text-slate-400">Manage your personal information and account details.</p>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-64 bg-white/5 rounded-2xl border border-white/10"></div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                
                {/* Profile Header */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/10">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border-[3px] border-indigo-500/30 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-indigo-500/20">
                    {avatarLetter}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{fields.name || 'Traveler'}</h2>
                    <p className="text-slate-400">{user?.email}</p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      Free Plan
                    </span>
                  </div>
                </div>

                {success && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 text-sm">
                    ✅ Profile updated successfully.
                  </div>
                )}
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSaveAccount} className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email" disabled value={user?.email || ''} 
                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/5 text-slate-500 cursor-not-allowed pl-10"
                      />
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Shield className="w-3 h-3"/> Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                    <input 
                      type="text" value={fields.name} onChange={e => setFields({...fields, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                    <input 
                      type="tel" value={fields.phone} onChange={e => setFields({...fields, phone: e.target.value})} placeholder="+84..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition"
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={saving} className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all transform hover:-translate-y-0.5 shadow-lg shadow-indigo-500/25">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      <FloatingCopilot />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <ProfileInner />
    </Suspense>
  );
}
