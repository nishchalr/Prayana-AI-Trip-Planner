import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrayana } from '../../context/PrayanaContext';
import { MobilityLevel } from '../../types';
import { MechanicalGrid } from './MechanicalGrid';
import { Eye, EyeOff, ArrowRight, AlertCircle, Compass } from 'lucide-react';

const POP_SPRING = { type: 'spring', stiffness: 450, damping: 26 };

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, demoBypass } = usePrayana();

  const [mode, setMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up Specific Fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('32');
  const [mobility, setMobility] = useState<MobilityLevel>('Full Mobility');

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Clean error translation
  const formatError = (err: any): string => {
    const raw = String(err?.code || err?.message || err);
    if (
      raw.includes('invalid-credential') ||
      raw.includes('user-not-found') ||
      raw.includes('wrong-password') ||
      raw.includes('invalid-login-credentials')
    ) {
      return '[ ERR: INVALID EMAIL OR PASSWORD ]';
    }
    if (raw.includes('email-already-in-use')) {
      return '[ ERR: EMAIL ALREADY REGISTERED ]';
    }
    if (raw.includes('weak-password')) {
      return '[ ERR: PASSKEY MUST BE AT LEAST 6 CHARACTERS ]';
    }
    if (raw.includes('invalid-email')) {
      return '[ ERR: PLEASE SPECIFY A VALID EMAIL ADDRESS ]';
    }
    if (raw.includes('popup-closed-by-user')) {
      return '[ NOTICE: GOOGLE SIGN-IN CANCELLED ]';
    }
    return `[ ERR: AUTHENTICATION FAILED ]`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('[ ERR: PLEASE ENTER EMAIL & PASSKEY ]');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      setErrorMsg(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('[ ERR: CALLSIGN / FULL NAME REQUIRED ]');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMsg('[ ERR: PLEASE ENTER EMAIL & PASSKEY ]');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('[ ERR: PASSKEY MUST BE AT LEAST 6 CHARACTERS ]');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(
        name.trim(),
        Number(age) || 30,
        email.trim(),
        password,
        mobility
      );
    } catch (err: any) {
      setErrorMsg(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#0E0E0E] flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* 1. Cursor-Driven Mechanical Coordinate Grid Background Canvas */}
      <MechanicalGrid />

      {/* 2. Brutalist Architectural Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[430px] bg-[#121212] border border-[rgba(242,240,235,0.16)] p-6 sm:p-7 shadow-[0_24px_56px_rgba(0,0,0,0.92)]"
      >
        {/* Top Edge White Accent Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#F2F0EB]" />

        {/* Top Header Strip: Prayana Compass Emblem + Status */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(242,240,235,0.1)]">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#F2F0EB]/30 bg-[#0E0E0E] flex items-center justify-center">
              <img
                src="/prayana-logo.png"
                alt="Prayana"
                className="w-[185%] h-[185%] max-w-none object-cover object-[center_34%] pointer-events-none"
              />
            </div>
            <div>
              <div className="font-serif text-lg tracking-tight text-[#F2F0EB] leading-none">
                Prayana
              </div>
              <div className="font-mono text-[8px] uppercase tracking-wideHud text-ink-muted mt-0.5">
                ACCESS GATE // SYS.PRYN.AUTH
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 font-mono text-[9px] text-ink-secondary bg-[#181818] border border-[rgba(242,240,235,0.12)] px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tracking-widest">[ AUTH_READY ]</span>
          </div>
        </div>

        {/* Mode Switcher Tabs (Framer Motion Sliding Underline) */}
        <div className="relative flex border-b border-[rgba(242,240,235,0.12)] mt-5 mb-5 font-mono text-[10px] tracking-widest uppercase">
          <button
            type="button"
            onClick={() => {
              setMode('SIGN_IN');
              setErrorMsg(null);
            }}
            className={`relative flex-1 pb-2.5 text-center transition-colors cursor-pointer ${
              mode === 'SIGN_IN' ? 'text-[#F2F0EB] font-bold' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            SIGN IN
            {mode === 'SIGN_IN' && (
              <motion.div
                layoutId="authTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2F0EB]"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('SIGN_UP');
              setErrorMsg(null);
            }}
            className={`relative flex-1 pb-2.5 text-center transition-colors cursor-pointer ${
              mode === 'SIGN_UP' ? 'text-[#F2F0EB] font-bold' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            CREATE ACCOUNT
            {mode === 'SIGN_UP' && (
              <motion.div
                layoutId="authTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F2F0EB]"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        </div>

        {/* Inline Error Notice */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-2 bg-[#261515] border border-semantic-hazard/50 text-semantic-hazard font-mono text-[9px] tracking-wide flex items-center space-x-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </motion.div>
        )}

        {/* Dynamic Form Transition via AnimatePresence (Parallel Zero-Wait) */}
        <AnimatePresence mode="popLayout" initial={false}>
          {mode === 'SIGN_IN' ? (
            <motion.form
              key="signin-form"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSignIn}
              className="space-y-4"
            >
              {/* Email Input */}
              <div className="space-y-1 group">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary transition-colors">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-transparent group-focus-within:bg-[#F2F0EB] transition-colors" />
                    <span>EMAIL IDENTIFIER</span>
                  </span>
                  <span className="text-[8px] text-ink-secondary">ASCII</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="explorer@prayana.arch"
                  required
                  className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-3 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors placeholder:text-ink-muted/50"
                />
              </div>

              {/* Password Input with Show/Hide */}
              <div className="space-y-1 group">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary transition-colors">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-transparent group-focus-within:bg-[#F2F0EB] transition-colors" />
                    <span>ACCESS PASSKEY</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="text-[8px] text-ink-secondary hover:text-[#F2F0EB] transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    {showPassword ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    <span>[ {showPassword ? 'HIDE' : 'SHOW'} ]</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-3 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors placeholder:text-ink-muted/50"
                />
              </div>

              {/* Primary Submit CTA */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={POP_SPRING}
                className="w-full mt-2 bg-[#F2F0EB] hover:bg-white text-[#0E0E0E] font-mono text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 flex items-center justify-center space-x-2 border border-[#F2F0EB] transition-colors duration-150 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>{isLoading ? '[ AUTHENTICATING... ]' : 'ENTER WORKSPACE [→]'}</span>
                {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="signup-form"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleSignUp}
              className="space-y-3.5"
            >
              {/* Full Name */}
              <div className="space-y-1 group">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary transition-colors">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-transparent group-focus-within:bg-[#F2F0EB] transition-colors" />
                    <span>TRAVELER CALLSIGN / NAME</span>
                  </span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Maya Chen"
                  required
                  className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-3 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors placeholder:text-ink-muted/50"
                />
              </div>

              {/* Age & Mobility Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-1 group">
                  <div className="font-mono text-[8px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary">
                    AGE (YEARS)
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    required
                    className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-2.5 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <div className="font-mono text-[8px] tracking-wideHud text-ink-muted uppercase">
                    MOBILITY BASELINE
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Full Mobility', 'Assisted', 'Wheelchair-Accessible'] as MobilityLevel[]).map(lvl => {
                      const label = lvl === 'Full Mobility' ? 'FULL' : lvl === 'Assisted' ? 'ASST' : 'WHEEL';
                      const isSelected = mobility === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setMobility(lvl)}
                          className={`py-2 px-1 text-center font-mono text-[8px] tracking-tighter uppercase border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#F2F0EB] text-[#0E0E0E] font-bold border-[#F2F0EB]'
                              : 'bg-[#0E0E0E] text-ink-secondary border-[rgba(242,240,235,0.14)] hover:border-ink-primary'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1 group">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary transition-colors">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-transparent group-focus-within:bg-[#F2F0EB] transition-colors" />
                    <span>EMAIL IDENTIFIER</span>
                  </span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="traveler@prayana.arch"
                  required
                  className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-3 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors placeholder:text-ink-muted/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-1 group">
                <div className="flex items-center justify-between font-mono text-[9px] tracking-wideHud text-ink-muted uppercase group-focus-within:text-ink-primary transition-colors">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-transparent group-focus-within:bg-[#F2F0EB] transition-colors" />
                    <span>PASSKEY (MIN 6 CHARS)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="text-[8px] text-ink-secondary hover:text-[#F2F0EB] transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    {showPassword ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                    <span>[ {showPassword ? 'HIDE' : 'SHOW'} ]</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0E0E0E] text-[#F2F0EB] font-mono text-xs px-3 py-2 border border-[rgba(242,240,235,0.14)] focus:border-[#F2F0EB] focus:outline-none transition-colors placeholder:text-ink-muted/50"
                />
              </div>

              {/* Submit Sign-Up CTA */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={POP_SPRING}
                className="w-full mt-2 bg-[#F2F0EB] hover:bg-white text-[#0E0E0E] font-mono text-[10px] font-bold tracking-widest uppercase py-2.5 px-4 flex items-center justify-center space-x-2 border border-[#F2F0EB] transition-colors duration-150 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>{isLoading ? '[ CREATING PROFILE... ]' : 'INITIALIZE PROFILE [→]'}</span>
                {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4 font-mono text-[8px] text-ink-muted uppercase tracking-widest">
          <div className="flex-1 border-t border-[rgba(242,240,235,0.1)]" />
          <span className="px-2 bg-[#121212]">OR IDENTITY PROVIDER</span>
          <div className="flex-1 border-t border-[rgba(242,240,235,0.1)]" />
        </div>

        {/* Google Sign-In Button */}
        <motion.button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={POP_SPRING}
          className="w-full py-2.5 px-4 bg-[#181818] hover:bg-[#202020] text-[#F2F0EB] border border-[rgba(242,240,235,0.18)] hover:border-[#F2F0EB] flex items-center justify-center space-x-2 font-mono text-[9px] tracking-wideHud uppercase transition-colors duration-150 cursor-pointer disabled:opacity-50"
        >
          <span className="font-bold text-xs">[G]</span>
          <span>CONTINUE WITH GOOGLE [G]</span>
        </motion.button>

        {/* Demo Bypass Link */}
        <div className="mt-5 pt-3 border-t border-[rgba(242,240,235,0.08)] text-center">
          <button
            type="button"
            onClick={demoBypass}
            className="text-ink-muted hover:text-[#F2F0EB] hover:underline font-mono text-[9px] tracking-wideHud uppercase transition-colors cursor-pointer"
          >
            [ DEMO BYPASS: ENTER AS COORG COHORT → ]
          </button>
        </div>
      </motion.div>

      {/* Subtle Corner Telemetry Footer */}
      <div className="relative z-10 w-full max-w-[430px] flex items-center justify-between font-mono text-[8px] text-ink-muted uppercase tracking-widest mt-3 px-1">
        <span>SECURITY: TLS 1.3 · ZERO TRACKERS</span>
        <span>BRUTALIST ARCHITECTURAL NOIR</span>
      </div>
    </div>
  );
};