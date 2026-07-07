'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Settings as SettingsIcon, CreditCard, Sparkles, LogOut, Shield } from 'lucide-react';
import { getMe, updateMe, changePassword } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

import { getAppCurrency, setAppCurrency } from '@/lib/currency';

const SETTINGS_TABS = [
  { id: 'account', label: 'Account Security', icon: Shield, desc: 'Manage password and account access' },
  { id: 'ai', label: 'AI Preferences', icon: Sparkles, desc: 'Teach AI how you love to travel' },
  { id: 'preferences', label: 'App Preferences', icon: SettingsIcon, desc: 'Language, currency & formatting' },
  { id: 'billing', label: 'Subscription', icon: CreditCard, desc: 'Manage your plan and billing' },
];

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const initialTab = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Account Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // AI Preference local states
  const [pace, setPace] = useState('Moderate');
  const [dietary, setDietary] = useState<string[]>([]);
  const [travelStyles, setTravelStyles] = useState<string[]>([]);

  // Preferences
  const [currency, setCurrency] = useState('VND');

  useEffect(() => {
    setCurrency(getAppCurrency());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    fetchUser();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && SETTINGS_TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  async function fetchUser() {
    try {
      const data = await getMe() as any;
      setUser(data);
      // Parse AI preferences if they exist in travel_profile
      if (data.travel_profile) {
        if (data.travel_profile.budget_level) setPace(data.travel_profile.budget_level);
        if (data.travel_profile.dietary) setDietary(data.travel_profile.dietary.split(',').map((s: string) => s.trim()).filter(Boolean));
        if (data.travel_profile.preferred_style) setTravelStyles(data.travel_profile.preferred_style.split(',').map((s: string) => s.trim()).filter(Boolean));
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAI(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const profileToSave = {
        ...user?.travel_profile,
        budget_level: pace,
        dietary: dietary.join(', '),
        preferred_style: travelStyles.join(', '),
      };
      const updated = await updateMe(profileToSave);
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update AI preferences');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    router.push('/login');
  }

  function toggleArray(arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) {
    if (arr.includes(val)) setArr(arr.filter(item => item !== val));
    else setArr([...arr, val]);
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
            <Link
              href="/profile"
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600/60 to-violet-600/60 border border-indigo-500/60 flex items-center justify-center hover:border-indigo-400 transition">
                <span className="text-sm font-bold text-indigo-200">{avatarLetter}</span>
              </div>
            </Link>
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
          <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-10">
            
            {/* Left Menu */}
            <div className="w-full md:w-64 flex-shrink-0">
              <h2 className="text-xl font-bold text-white mb-6 px-2">Settings</h2>
              
              <div className="space-y-1">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 w-48 bg-white/5 rounded-lg mb-8"></div>
                  <div className="h-64 bg-white/5 rounded-2xl"></div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">
                      {SETTINGS_TABS.find(t => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-slate-400">
                      {SETTINGS_TABS.find(t => t.id === activeTab)?.desc}
                    </p>
                  </div>

                  {success && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Settings saved successfully.
                    </div>
                  )}
                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      {error}
                    </div>
                  )}

                  {/* ── Tab: Account Security ── */}
                  {activeTab === 'account' && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-xl shadow-2xl backdrop-blur-xl">
                      <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Current Password</label>
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition outline-none"
                            placeholder="Enter current password"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">New Password</label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition outline-none"
                            placeholder="New password (min 6 characters)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition outline-none"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="pt-4 border-t border-white/10 flex justify-end">
                          <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50">
                            {saving ? 'Updating...' : 'Change Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ── Tab: AI Preferences ── */}
                  {activeTab === 'ai' && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                      <form onSubmit={handleSaveAI} className="space-y-8">
                        <div>
                          <label className="block text-sm font-medium text-white mb-3">Preferred Travel Pace</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['Relaxed', 'Moderate', 'Fast-paced'].map(p => (
                              <button
                                key={p} type="button" onClick={() => setPace(p)}
                                className={`p-4 rounded-xl border text-sm font-medium transition ${pace === p ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-3">Dietary Requirements</label>
                          <div className="flex flex-wrap gap-2">
                            {['None', 'Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Nut Allergy'].map(d => (
                              <button
                                key={d} type="button" onClick={() => {
                                  if (d === 'None') setDietary(['None']);
                                  else {
                                    const newArr = dietary.filter(x => x !== 'None');
                                    if (newArr.includes(d)) setDietary(newArr.filter(x => x !== d));
                                    else setDietary([...newArr, d]);
                                  }
                                }}
                                className={`px-4 py-2 rounded-full border text-sm transition ${dietary.includes(d) || (d==='None' && dietary.length===0) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-3">Favorite Travel Styles</label>
                          <div className="flex flex-wrap gap-2">
                            {['Nature & Outdoors', 'Culture & History', 'Luxury Resorts', 'Backpacking', 'Food & Culinary', 'Shopping', 'Nightlife', 'Beaches'].map(s => (
                              <button
                                key={s} type="button" onClick={() => toggleArray(travelStyles, setTravelStyles, s)}
                                className={`px-4 py-2 rounded-full border text-sm transition ${travelStyles.includes(s) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-end">
                          <button type="submit" disabled={saving} className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold transition-all transform hover:-translate-y-0.5 shadow-lg shadow-indigo-500/25">
                            {saving ? 'Updating AI...' : 'Update AI Preferences'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ── Tab: Preferences ── */}
                  {activeTab === 'preferences' && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-xl space-y-6 shadow-2xl backdrop-blur-xl">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Display Currency</label>
                        <select 
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition appearance-none"
                        >
                          <option value="VND">Vietnamese Dong (₫)</option>
                          <option value="USD">US Dollar ($)</option>
                          <option value="EUR">Euro (€)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Language</label>
                        <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-indigo-500/50 transition appearance-none">
                          <option value="en">English</option>
                          <option value="vi">Tiếng Việt</option>
                        </select>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <button 
                          onClick={() => {
                            setAppCurrency(currency);
                            setSuccess(true);
                            setTimeout(() => setSuccess(false), 3000);
                          }}
                          className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition"
                        >
                          Save Preferences
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Tab: Subscription ── */}
                  {activeTab === 'billing' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-white/5 to-indigo-950/40 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-start justify-between mb-8">
                          <div>
                            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white mb-4">Current Plan</span>
                            <h2 className="text-3xl font-bold text-white mb-2">Basic (Free)</h2>
                            <p className="text-slate-400">You are currently on the free plan.</p>
                          </div>
                          <div className="text-4xl font-bold text-white">0 ₫<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                        </div>
                        <div className="space-y-3 mb-8">
                          <p className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Up to 3 AI generated trips</p>
                          <p className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Basic budget tracking</p>
                          <p className="text-sm flex items-center gap-2 text-slate-500"><CheckCircle2 className="w-4 h-4 opacity-50"/> Advanced PDF exports (Locked)</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 border border-white/20 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-white/20 transition-all duration-700"></div>
                        <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Upgrade to Pro</h3>
                        <p className="text-indigo-100 mb-6 max-w-md relative z-10">Unlock unlimited AI trip generations, detailed analytics, advanced PDF exports, and priority support for just 199.000 ₫/mo.</p>
                        <button className="px-6 py-3 rounded-xl bg-white text-indigo-600 hover:bg-slate-50 font-bold transition relative z-10 shadow-xl">
                          Upgrade Now
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Wrap inside Suspense for searchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
      <SettingsInner />
    </Suspense>
  );
}
// Adding CheckCircle2 to imports implicitly used above.
function CheckCircle2({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
}

