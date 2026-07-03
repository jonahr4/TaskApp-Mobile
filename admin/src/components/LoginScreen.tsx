interface LoginScreenProps {
  onSignIn: () => void;
  error?: "not-admin";
  uid?: string;
}

export function LoginScreen({ onSignIn, error, uid }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display text-5xl mb-4">
            Task<span className="gradient-text">App</span>
          </h1>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/5 px-5 py-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
              Admin Dashboard
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-8">
          {error === "not-admin" ? (
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-foreground font-medium mb-1">
                Access Denied
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This account is not authorized. Make sure your UID is set in the
                admin <code className="font-mono text-accent bg-accent/5 px-1.5 py-0.5 rounded">.env</code> file.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
              Sign in with your admin Google account to view user analytics and engagement insights.
            </p>
          )}

          <button
            onClick={onSignIn}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-accent-secondary text-white font-medium text-sm shadow-soft hover:shadow-accent-glow hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {error === "not-admin" ? "Try Another Account" : "Sign in with Google"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          TaskApp Admin · For authorized administrators only
        </p>
      </div>
    </div>
  );
}
