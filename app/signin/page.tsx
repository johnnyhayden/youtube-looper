import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';

const errorMessages: Record<string, string> = {
  AccessDenied: 'That Google account is not allowed to use this app.',
};

// Only allow same-origin relative redirects after sign-in
function safeCallbackUrl(value: string | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallbackUrl(callbackUrl);
  const errorMessage = error ? errorMessages[error] || 'Sign-in failed. Please try again.' : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="w-14 h-14 mx-auto mb-4" />
        <h1 className="text-xl font-bold tracking-tight mb-1">
          <span className="text-primary">YouTube</span> Looper
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to access your presets and practice history.
        </p>

        {errorMessage && (
          <p className="text-sm text-destructive mb-4">{errorMessage}</p>
        )}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo });
          }}
        >
          <Button type="submit" className="w-full">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            Sign in with Google
          </Button>
        </form>
      </div>
    </div>
  );
}
