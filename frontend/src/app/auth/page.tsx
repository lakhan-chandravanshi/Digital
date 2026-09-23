"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import styles from "./auth.module.css";

const api = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-beta-ten-t6mhx1k4pi.vercel.app/api/v1";
type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mode") === "login") setMode("login"); }, []);
  function changeMode(nextMode: AuthMode) { setMode(nextMode); setMessage(""); setPassword(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`${api}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? "We could not complete that request."); return; }
    localStorage.setItem("digital-heroes-token", data.token); window.location.href = "/dashboard";
  }
  const isSignup = mode === "signup";
  return <main className={styles.page}>
    <div className={`${styles.orb} ${styles.orbOne}`} /><div className={`${styles.orb} ${styles.orbTwo}`} />
    <nav className={styles.nav}><a className={styles.brand} href="/"><span className={styles.brandMark}>D</span>digital<span className={styles.brandDot}>.</span>heroes</a><a className={styles.homeLink} href="/">Back home <ArrowRight size={15} /></a></nav>
    <section className={styles.shell}>
      <div className={styles.intro}><div><p className={styles.eyebrow}><span /> A membership with meaning</p><h1>Play well.<br /><em>Give better.</em></h1><p className={styles.introCopy}>Your next round can do more. Join a community turning good games into real-world impact.</p></div><div><div className={styles.impact}><strong>10%</strong><span>minimum of every membership<br />goes to your chosen charity</span></div><div className={styles.security}><ShieldCheck size={16} /> Secure member access</div></div></div>
      <section className={styles.card}><div className={styles.tabs}><button className={isSignup ? styles.active : ""} type="button" onClick={() => changeMode("signup")}>Create account</button><button className={!isSignup ? styles.active : ""} type="button" onClick={() => changeMode("login")}>Sign in</button></div><p className={styles.kicker}>{isSignup ? "Start your membership" : "Welcome back"}</p><h2>{isSignup ? <>Join the<br /><em>movement.</em></> : <>Good to<br /><em>see you.</em></>}</h2><form onSubmit={submit}><label htmlFor="email">Email address<span className={styles.input}><Mail size={17} /><input id="email" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></span></label><label htmlFor="password">Password<span className={styles.input}><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button className={styles.primary} type="submit"><span>{isSignup ? "Create account" : "Sign in to dashboard"}</span><ArrowRight size={19} /></button></form><p className={styles.message}>{message}</p><p className={styles.switch}>{isSignup ? "New to Digital Heroes?" : "Already have an account?"} <button type="button" onClick={() => changeMode(isSignup ? "login" : "signup")}>{isSignup ? "Sign in ↗" : "Create your account ↗"}</button></p></section>
    </section>
  </main>;
}
