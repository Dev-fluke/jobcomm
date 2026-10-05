import React from 'react';
import { Zap } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'กำลังโหลดข้อมูล...',
  subMessage = 'แผนกสื่อสาร หน่วยบัญชาการอากาศโยธิน',
  fullScreen = true
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Electric Lightning Icon Container */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Pulsing aura ring */}
        <div className="absolute w-28 h-28 rounded-full bg-amber-500/10 animate-ping duration-1000" />

        {/* Rotating accent ring */}
        <div className="w-20 h-20 rounded-full border-2 border-amber-400/20 border-t-amber-400 border-r-amber-400/50 animate-spin" />

        {/* Glowing electric badge */}
        <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/10 backdrop-blur-xs flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.35)] border border-amber-400/40">
          <Zap className="w-8 h-8 text-amber-400 fill-amber-400 animate-electric" />
        </div>
      </div>

      {/* Main Text */}
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center justify-center gap-1.5 font-['Prompt',sans-serif]">
        <span>{message}</span>
      </h2>

      {/* Subtitle / Department branding */}
      {subMessage && (
        <p className="text-xs sm:text-sm text-blue-200/80 mt-1.5 font-medium tracking-wide">
          {subMessage}
        </p>
      )}

      {/* Indeterminate electric progress bar */}
      <div className="w-48 sm:w-56 h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 mt-5 relative">
        <div className="w-1/2 h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full animate-progress-indeterminate shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      </div>
    </div>
  );

  if (!fullScreen) {
    return <div className="py-16 flex items-center justify-center">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white">
      {content}
    </div>
  );
};
