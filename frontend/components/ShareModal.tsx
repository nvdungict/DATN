'use client';
import { useState, useEffect } from 'react';
import { getCollaborators, inviteCollaborator, removeCollaborator } from '@/lib/api';

export default function ShareModal({ tripId, onClose }: { tripId: number, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [collabs, setCollabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCollabs = async () => {
    try {
      const data = await getCollaborators(tripId);
      setCollabs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCollabs();
  }, [tripId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteCollaborator(tripId, email, role);
      setEmail('');
      await fetchCollabs();
    } catch (e: any) {
      alert(e.message || 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Remove this collaborator?")) return;
    try {
      await removeCollaborator(tripId, userId);
      await fetchCollabs();
    } catch (e: any) {
      alert(e.message || 'Failed to remove user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Share Trip</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@email.com" 
              required
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-violet-500 transition-colors"
            />
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
            >
              <option value="VIEWER">Can View</option>
              <option value="EDITOR">Can Edit</option>
            </select>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Invite
            </button>
          </form>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">Collaborators</h3>
            {collabs.length === 0 ? (
              <p className="text-white/50 text-sm">No one has been invited yet.</p>
            ) : (
              collabs.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="text-white font-medium">{c.email}</p>
                    <p className="text-xs text-white/50 capitalize">{c.role.toLowerCase()} • {c.status}</p>
                  </div>
                  <button onClick={() => handleRemove(c.user_id)} className="text-rose-400 hover:text-rose-300 text-sm font-medium">Remove</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
