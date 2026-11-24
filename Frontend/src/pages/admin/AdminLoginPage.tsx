import {
  ArrowLeft,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  LockKeyhole,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '../../components/brand/Logo';
import { ContainerStack } from '../../components/illustrations/ContainerStack';
import { buttonClasses } from '../../components/ui/button-styles';
import { FieldShell, inputClasses } from '../../components/ui/Field';
import { useAuth } from '../../features/admin/auth-context';
import { safeNextPath } from '../../features/admin/next-path';
import { cn } from '../../lib/cn';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<'email' | 'password', string>>;

/**
 * Staff sign-in. There is deliberately no "register" or "forgot password"
 * link: accounts are created by an administrator with `npm run admin:create`.
 */
export function AdminLoginPage() {
  const { state, signIn } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Fields are disabled while signing in, and a disabled field can't take
  // focus. So focus is moved after the re-render that enables them again.
  const focusAfterSubmit = useRef<'email' | 'password' | null>(null);
  useEffect(() => {
    if (submitting || !focusAfterSubmit.current) return;
    (focusAfterSubmit.current === 'email' ? emailRef : passwordRef).current?.focus();
    focusAfterSubmit.current = null;
  }, [submitting]);

  if (state.status === 'authenticated') return <Navigate to={next} replace />;

  const notice =
    params.get('expired') === '1'
      ? 'Your session has ended. Please sign in again.'
      : params.get('signedOut') === '1'
        ? 'You have been signed out.'
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Instant checks for obvious mistakes. The server re-checks everything.
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email) return emailRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    const outcome = await signIn(email.trim(), password);

    switch (outcome.kind) {
      case 'ok':
        navigate(next, { replace: true });
        return;
      case 'invalid-credentials':
        setFormError(outcome.message);
        setPassword('');
        focusAfterSubmit.current = 'password';
        break;
      case 'validation':
        setFieldErrors(outcome.fields);
        focusAfterSubmit.current = outcome.fields.email ? 'email' : 'password';
        break;
      case 'rate-limited': {
        const minutes = Math.max(1, Math.ceil(outcome.retryAfterSeconds / 60));
        setFormError(
          `Too many sign-in attempts. Please wait about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`,
        );
        break;
      }
      default:
        setFormError("We couldn't reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  }

  return (
    <>
      <title>Staff sign in | Reduium</title>
      <meta name="robots" content="noindex" />

      <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Brand panel (large screens) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
          <Logo tone="paper" />
          <div className="relative z-10 max-w-md">
            <p className="type-label flex items-center gap-3 text-fog">
              <span className="size-1.5 rounded-full bg-signal" aria-hidden />
              Operations console
            </p>
            <p className="type-display mt-5 text-4xl leading-tight xl:text-5xl">
              Every shipment, <span className="text-signal">accounted</span> for.
            </p>
            <p className="mt-5 text-fog">
              Staff sign-in for shipment management and customer support. Access is restricted to
              authorised Reduium personnel.
            </p>
            <p className="mt-4 text-sm text-paper/55">
              Accounts are created by an administrator. There is no public registration.
            </p>
          </div>
          {/* Spacer keeps the text block clear of the illustration below. */}
          <div aria-hidden className="h-40" />
          <ContainerStack className="pointer-events-none absolute -right-10 -bottom-6 w-[70%] opacity-90" />
        </aside>

        {/* Sign-in form */}
        <main className="flex flex-col px-4 py-8 sm:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <LockKeyhole aria-hidden className="size-7 text-signal-600" />
            <h1 className="type-display mt-4 text-3xl text-ink sm:text-4xl">Staff sign in</h1>
            <p className="mt-2 text-ink-600">For Reduium team members only.</p>

            {notice && (
              <p
                role="status"
                className="mt-6 flex items-start gap-2.5 rounded-sm border border-tone-progress/30 bg-tone-progress-bg px-3.5 py-3 text-sm text-tone-progress"
              >
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {notice}
              </p>
            )}

            {formError && (
              <p
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-sm border border-tone-critical/40 bg-tone-critical-bg px-3.5 py-3 text-sm text-tone-critical"
              >
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {formError}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-7 space-y-5"
              aria-busy={submitting}
            >
              <FieldShell label="Email address" error={fieldErrors.email}>
                {({ inputId, describedBy }) => (
                  <input
                    ref={emailRef}
                    id={inputId}
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                    }}
                    aria-describedby={describedBy}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    disabled={submitting}
                    maxLength={254}
                    className={cn(inputClasses, 'h-12')}
                  />
                )}
              </FieldShell>

              <FieldShell label="Password" error={fieldErrors.password}>
                {({ inputId, describedBy }) => (
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      id={inputId}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((f) => ({ ...f, password: undefined }));
                        }
                      }}
                      aria-describedby={describedBy}
                      aria-invalid={fieldErrors.password ? true : undefined}
                      disabled={submitting}
                      maxLength={128}
                      className={cn(inputClasses, 'h-12 pr-12')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      aria-controls={inputId}
                      disabled={submitting}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-sm text-ink-400 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden className="size-5" />
                      ) : (
                        <Eye aria-hidden className="size-5" />
                      )}
                    </button>
                  </div>
                )}
              </FieldShell>

              <button
                type="submit"
                disabled={submitting}
                className={buttonClasses('primary', 'lg', 'w-full')}
              >
                {submitting ? (
                  <>
                    <LoaderCircle
                      aria-hidden
                      className="size-5 animate-spin motion-reduce:animate-none"
                    />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-8 text-sm text-ink-400">
              Trouble signing in? Ask a Reduium administrator to check your account.
            </p>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 self-start text-sm font-medium text-ink-600 hover:text-ink"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to the public website
          </Link>
        </main>
      </div>
    </>
  );
}
