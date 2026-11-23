import { Globe, LogIn, LogOut, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';
import { ActiveView } from '../types';

interface TopBarProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  onOpenSettings: () => void;
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveView; label: string; hasGlobe?: boolean }> = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'intel', label: 'Live Intel', hasGlobe: true },
];

export function TopBar({
  activeView,
  onChangeView,
  onOpenSettings,
  user,
  authReady,
  isSigningIn,
  onSignIn,
  onSignOut,
}: TopBarProps) {
  const displayLabel = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-30 border-b border-[#2C2545]/90 bg-[#0D0B14]/88 backdrop-blur-xl shadow-[0_8px_24px_-16px_rgba(0,0,0,0.8)]">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 sm:gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-line Star Wars Display Wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('workspace')}
          className="sw-title text-sm sm:text-base font-bold text-[#F3F0FA] whitespace-nowrap shrink-0 hover:text-[#C084FC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7] rounded"
        >
          DROID TYCOON TRACKER
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`relative inline-flex items-center gap-1.5 py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7] rounded ${
                  isActive ? 'text-[#F3F0FA]' : 'text-[#A79EC0] hover:text-[#E9E4F5]'
                }`}
              >
                {item.hasGlobe && (
                  <Globe
                    className={`h-3.5 w-3.5 transition-colors ${
                      isActive ? 'text-[#4ADE80]' : 'text-[#8E84AA]'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span>{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="topbar-active-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-gradient-to-r from-[#A855F7] to-[#4ADE80] shadow-[0_0_10px_rgba(168,85,247,0.55)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Auth & Settings actions */}
        <div className="flex items-center gap-2 shrink-0">
          {authReady && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#2F2848] bg-[#141022]/90 px-2.5 py-1.5 text-xs text-[#E9E4F5]">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-4 w-4 rounded-full object-cover"
                      />
                    ) : null}
                    <span className="max-w-[110px] truncate">{displayLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    title={`Signed in as ${user.email ?? displayLabel}. Click to sign out.`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#352D52] bg-[#171326] px-3 py-2 text-xs font-medium text-[#A79EC0] hover:border-[#FB7185]/60 hover:text-[#FDA4AF] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="saber-purple-btn inline-flex items-center gap-1.5 rounded-lg bg-[#9333EA] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A855F7] active:scale-[0.98] disabled:opacity-50 transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isSigningIn ? 'Signing in...' : 'Sign In'}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-[#352D52] bg-[#171326] px-3 py-2 text-xs font-medium text-[#E9E4F5] hover:border-[#A855F7]/60 hover:bg-[#1F1A33] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A855F7]"
          >
            <Settings className="h-3.5 w-3.5 text-[#C084FC]" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
