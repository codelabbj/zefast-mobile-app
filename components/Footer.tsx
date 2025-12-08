import React from 'react'

export function Footer() {
  return (
    <footer className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 py-4 px-5 safe-area-bottom">
      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Développé par{' '}
          <button
            onClick={() => window.open('https://codelab.bj', '_blank', 'noopener,noreferrer')}
            className="text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/80 font-semibold underline underline-offset-2 transition-colors duration-200"
          >
            Code Lab
          </button>
        </p>
      </div>
    </footer>
  )
}
