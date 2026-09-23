"use client";

import { FormEvent, useEffect, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-beta-ten-t6mhx1k4pi.vercel.app/api/v1";
type Analytics = { totalUsers: number; totalPrizePool: number; drawStats: { published: number } };
type Winner = { id: string; matchType: string; prizeAmount: string; user: { email: string } };
type Charity = { id: string; title: string; description: string; spotlightFlag: boolean };
type Score = { id: string; scoreValue: number; scoreDate: string };
type Donation = { id: string; amount: number; createdAt: string };
type User = { id: string; email: string; role: string; createdAt: string; subscription: { status: string; planType: string; renewalDate: string | null } | null; scores: Score[]; charitySettings: { contributionPercentage: number; charity: { title: string } }[]; donations: Donation[] };

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const token = typeof window === "undefined" ? "" : window.localStorage.getItem("digital-heroes-token") ?? "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function load() {
    if (!token) { window.location.href = "/auth?mode=login"; return; }
    const [summary, pending, charityData, userData] = await Promise.all([
      fetch(`${api}/admin/analytics`, { headers }).then((response) => response.ok ? response.json() : null),
      fetch(`${api}/admin/winners`, { headers }).then((response) => response.ok ? response.json() : { winners: [] }),
      fetch(`${api}/charities`).then((response) => response.json()),
      fetch(`${api}/admin/users`, { headers }).then((response) => response.ok ? response.json() : { users: [] }),
    ]);
    if (!summary) { window.location.href = "/auth?mode=login"; return; }
    setAnalytics(summary); setWinners(pending.winners); setCharities(charityData.charities); setUsers(userData.users);
  }
  useEffect(() => { load(); }, [token]);
  async function verify(id: string, verificationStatus: "APPROVED" | "REJECTED") { await fetch(`${api}/admin/winners/${id}/verify`, { method: "PUT", headers, body: JSON.stringify({ verificationStatus }) }); setWinners((current) => current.filter((winner) => winner.id !== id)); }
  async function createCharity(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const response = await fetch(`${api}/admin/charities`, { method: "POST", headers, body: JSON.stringify({ title, description, spotlightFlag: false }) }); if (response.ok) { setTitle(""); setDescription(""); await load(); } }
  async function deleteCharity(id: string) { if (!window.confirm("Delete this charity?")) return; await fetch(`${api}/admin/charities/${id}`, { method: "DELETE", headers }); setCharities((current) => current.filter((charity) => charity.id !== id)); }
  async function toggleSubscription(user: User) { const next = user.subscription?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"; await fetch(`${api}/admin/users/${user.id}/subscription`, { method: "PUT", headers, body: JSON.stringify({ status: next, planType: user.subscription?.planType ?? "MONTHLY" }) }); await load(); }
  return <main className="admin-page">
    <nav className="nav-shell">
      <a className="brand" href="/"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a>
      <a className="text-link" href="/dashboard">Member view <span>↗</span></a>
    </nav>
    <header className="admin-header">
      <div>
        <p className="eyebrow"><span className="eyebrow-line" /> Operations</p>
        <h1>Platform<br /><em>control.</em></h1>
      </div>
      <span className="member-chip"><span className="status-dot" /> Admin workspace</span>
    </header>
    <section className="admin-stats">
      <article><span>Total members</span><strong>{analytics?.totalUsers ?? "--"}</strong></article>
      <article><span>Prize pool</span><strong>£{analytics?.totalPrizePool ?? "--"}</strong></article>
      <article><span>Published draws</span><strong>{analytics?.drawStats.published ?? "--"}</strong></article>
    </section>
    <section className="admin-review">
      <div><p className="panel-kicker">Verification queue</p><h2>Winner claims</h2></div>
      {winners.length ? winners.map((winner) => <div className="review-row" key={winner.id}>
        <div><strong>{winner.user.email}</strong><span>{winner.matchType.replace("_", " ")} · £{winner.prizeAmount}</span></div>
        <button onClick={() => verify(winner.id, "REJECTED")}>Reject</button>
        <button className="approve" onClick={() => verify(winner.id, "APPROVED")}>Approve</button>
      </div>) : <p className="empty-state">No pending winner claims.</p>}
    </section>
    <section className="admin-manage">
      <div className="manage-block">
        <p className="panel-kicker">User management</p>
        <h2>Member activity</h2>
        <div className="manage-list">
          {users.map((user) => <div className="manage-row user-detail" key={user.id}>
            <div className="user-info">
              <div className="user-header">
                <strong>{user.email}</strong>
                <span className={`status-badge ${user.subscription?.status === "ACTIVE" ? "active" : "inactive"}`}>
                  {user.subscription?.status ?? "No subscription"}
                </span>
              </div>
              <div className="user-meta">
                <span>Role: {user.role}</span>
                <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                {user.subscription && <span>Plan: {user.subscription.planType} · Renewal: {user.subscription.renewalDate ? new Date(user.subscription.renewalDate).toLocaleDateString() : "N/A"}</span>}
              </div>
              {user.scores.length > 0 && <div className="user-activity">
                <strong>Recent scores:</strong>
                <div className="score-list">{user.scores.slice(0, 5).map((score) => <span key={score.id}>{score.scoreValue}</span>)}</div>
              </div>}
              {user.charitySettings.length > 0 && <div className="user-activity">
                <strong>Charity:</strong> {user.charitySettings[0].charity.title} ({user.charitySettings[0].contributionPercentage}%)
              </div>}
              {user.donations.length > 0 && <div className="user-activity">
                <strong>Donations:</strong> £{user.donations.reduce((sum, d) => sum + d.amount, 0).toFixed(2)} total ({user.donations.length} donations)
              </div>}
            </div>
            <button onClick={() => toggleSubscription(user)}>
              {user.subscription?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </div>)}
        </div>
      </div>
      <div className="manage-block">
        <p className="panel-kicker">Charity management</p>
        <h2>Add a cause</h2>
        <form onSubmit={createCharity}>
          <input required placeholder="Charity name" value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea required placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button className="button button-primary" type="submit">Create charity <span>↗</span></button>
        </form>
        <div className="manage-list">
          {charities.map((charity) => <div className="manage-row" key={charity.id}>
            <div><strong>{charity.title}</strong><span>{charity.description}</span></div>
            <button onClick={() => deleteCharity(charity.id)}>Delete</button>
          </div>)}
        </div>
      </div>
    </section>
  </main>;
}
