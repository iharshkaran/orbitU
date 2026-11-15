import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Orbit, ShieldCheck } from "lucide-react";
import { api } from "../utils/api";
import { useAuth } from "../context/useAuth";

const inputClass = "w-full rounded-xl border-2 border-[#e6e2dc] bg-[#fffdf9] px-4 py-3.5 text-sm text-[#191a32] outline-none transition placeholder:text-[#aaa6b1] focus:border-[#7660dc] focus:ring-4 focus:ring-[#7660dc]/10";

function Brand() {
  return <Link to="/" className="inline-flex items-center gap-3 text-xl font-black tracking-tight text-[#17182d]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#191a32] text-[#ffe35b]"><Orbit size={25} /></span>Orbit<span className="-ml-3 text-[#6f56d9]">U</span></Link>;
}

export default function PasswordResetPage({ reset = false }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { setUser } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (reset && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (reset) {
        await api.resetPassword({ token, password });
        setUser(null);
        setResult("password-reset");
      } else {
        const requestResult = await api.forgotPassword(email.trim());
        setResult(!requestResult.accountExists ? "not-found" : requestResult.emailSent ? "sent" : "delivery-error");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const invalidResetLink = reset && !/^[a-f0-9]{64}$/i.test(token);

  return (
    <main className="orbit-pattern-bg flex min-h-screen items-center justify-center px-4 py-10 text-[#17182d]">
      <section className="w-full max-w-[500px] rounded-[28px] border-2 border-[#191a32] bg-white p-6 shadow-[8px_9px_0_#c9bcff] sm:p-9">
        <Brand />

        {result ? (
          <div className="mt-10 text-center">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${result === "not-found" || result === "delivery-error" ? "bg-[#fff0f1] text-[#a33b48]" : "bg-[#e9f7ef] text-[#28734d]"}`}>{result === "password-reset" ? <CheckCircle2 size={29} /> : <Mail size={28} />}</span>
            <h1 className="mt-5 text-2xl font-black">{result === "password-reset" ? "Password updated" : result === "sent" ? "Check your inbox" : result === "not-found" ? "No account found" : "Email could not be sent"}</h1>
            <p className="mt-3 text-sm leading-6 text-[#777386]">{result === "password-reset" ? "Your password has been changed. You can now sign in with the new password." : result === "sent" ? "We’ve sent a one-time reset link to your email. It expires in 30 minutes." : result === "not-found" ? `There’s no OrbitU account registered with ${email.trim()}. Create an account to join the community.` : "We found your account, but Brevo could not deliver the reset email. Please try again later or contact the OrbitU administrator."}</p>
            {result === "sent" && <p className="mt-3 text-xs text-[#777386]">Didn’t receive it? Check your spam folder or request another link in a few minutes.</p>}
            {result === "not-found" ? <Link to="/?mode=signup" className="mt-7 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-3 font-bold shadow-[0_4px_0_#191a32]">Create an account</Link> : <Link to="/" className="mt-7 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-3 font-bold shadow-[0_4px_0_#191a32]">Back to sign in</Link>}
          </div>
        ) : invalidResetLink ? (
          <div className="mt-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f1] text-[#a33b48]"><KeyRound size={27} /></span>
            <h1 className="mt-5 text-2xl font-black">This reset link is incomplete</h1>
            <p className="mt-3 text-sm leading-6 text-[#777386]">Request a fresh password reset link and open it from your email.</p>
            <Link to="/forgot-password" className="mt-7 inline-flex w-full items-center justify-center rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-3 font-bold shadow-[0_4px_0_#191a32]">Request a new link</Link>
          </div>
        ) : (
          <>
            <span className="mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eee9ff] text-[#6f56d9]">{reset ? <ShieldCheck size={28} /> : <Mail size={28} />}</span>
            <h1 className="mt-5 text-2xl font-black">{reset ? "Choose a new password" : "Forgot your password?"}</h1>
            <p className="mt-2 text-sm leading-6 text-[#777386]">{reset ? "Use at least 8 characters. This will sign out your other sessions." : "Enter the email on your account and we’ll send you a one-time reset link."}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {!reset ? (
                <label className="block text-sm font-bold text-[#25243a]">Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={`${inputClass} mt-2 font-normal`} /></label>
              ) : (
                <>
                  <div><label htmlFor="reset-new-password" className="block text-sm font-bold text-[#25243a]">New password</label><div className="relative mt-2"><input id="reset-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={100} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className={`${inputClass} pr-12 font-normal`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-lg text-[#6e6a7b] transition hover:bg-[#eee9ff] hover:text-[#5947a8]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                  <div><label htmlFor="reset-confirm-password" className="block text-sm font-bold text-[#25243a]">Confirm new password</label><div className="relative mt-2"><input id="reset-confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={100} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" className={`${inputClass} pr-12 font-normal`} /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-lg text-[#6e6a7b] transition hover:bg-[#eee9ff] hover:text-[#5947a8]">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                </>
              )}
              {error && <p role="alert" className="rounded-xl border border-[#f0b6bd] bg-[#fff0f1] p-3 text-sm text-[#a33b48]">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl border-2 border-[#191a32] bg-[#ffe35b] px-4 py-3.5 font-bold shadow-[0_4px_0_#191a32] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{busy ? (reset ? "Updating password…" : "Sending link…") : (reset ? "Save new password" : "Send reset link")}</button>
            </form>
          </>
        )}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#6f56d9] hover:text-[#4e3ba8]"><ArrowLeft size={16} />Return to sign in</Link>
      </section>
    </main>
  );
}
