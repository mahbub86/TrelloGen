import React, { useState, useEffect, useRef } from 'react';
import { api as mockDB } from '../services/api';
import { User } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string) => Promise<void>;
  boardTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onShare, boardTitle }) => {
  // 1. Declare ALL hooks first
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Call useEffect unconditionally
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setFoundUser(null);
    setIsSearchingUser(false);

    if (isOpen && email.trim().length > 3 && email.includes('@')) {
        setIsSearchingUser(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const user = await mockDB.lookupUserByEmail(email);
                setFoundUser(user);
            } catch (e) {
                // Ignore errors during lookup
            } finally {
                setIsSearchingUser(false);
            }
        }, 500);
    }
  }, [email, isOpen]); // Added isOpen to dependency array

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onShare(email);
      setSuccess('Invitation sent successfully!');
      setEmail('');
      setFoundUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to share board.');
    } finally {
      setLoading(false);
    }
  };

  // 3. NOW check if we should render. This ensures hook count is consistent.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scaleIn relative overflow-hidden m-4 border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold text-gray-800">Share "{boardTitle}"</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <i className="fas fa-times text-lg"></i>
           </button>
        </div>

        {/* Copy Link Section */}
        <div className="mb-8">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 block">Board Link</label>
            <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 truncate select-all">
                    {window.location.href}
                </div>
                <button 
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                    {copied ? <i className="fas fa-check"></i> : <i className="fas fa-link"></i>}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>

        {/* Separator */}
        <div className="relative mb-8 text-center">
            <div className="absolute top-1/2 w-full h-px bg-gray-100"></div>
            <span className="relative bg-white px-3 text-xs text-gray-400 font-bold uppercase">Or invite by email</span>
        </div>

        {/* Invite Form */}
        <form onSubmit={handleSubmit}>
            {error && (
                <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i> {error}
                </div>
            )}
            {success && (
                <div className="mb-4 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <i className="fas fa-check-circle"></i> {success}
                </div>
            )}
            
            {/* User Preview Card */}
            {foundUser && (
                <div className="mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 animate-fadeIn">
                     {foundUser.avatarUrl ? (
                         <img src={foundUser.avatarUrl} alt={foundUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                     ) : (
                         <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                             {foundUser.initials}
                         </div>
                     )}
                     <div>
                         <p className="text-sm font-bold text-gray-800">{foundUser.name}</p>
                         <p className="text-xs text-blue-600">User Found</p>
                     </div>
                     <div className="ml-auto">
                         <i className="fas fa-check-circle text-blue-500 text-lg"></i>
                     </div>
                </div>
            )}

            <div className="flex gap-2">
                <div className="relative flex-1">
                     <input 
                        type="email"
                        placeholder="Enter email address..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {isSearchingUser && (
                        <div className="absolute right-3 top-3.5">
                             <i className="fas fa-spinner fa-spin text-gray-400"></i>
                        </div>
                    )}
                </div>
                
                <button 
                    type="submit"
                    disabled={loading || !email}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Invite'}
                </button>
            </div>
        </form>

      </div>
    </div>
  );
};

export default ShareModal;