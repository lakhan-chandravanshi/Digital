"use client";

import { FormEvent, useEffect, useState } from "react";

type Score = { id: string; scoreValue: number; scoreDate: string };
type Subscription = { status: string; planType: string; renewalDate: string | null } | null;
type Setting = { contributionPercentage: string; charity: { title: string } } | null;
type Draw = { drawDate: string | null; prizePoolEstimate: number };
type Winner = { id: string; prizeAmount: string; payoutStatus: string; matchType: string; proofImageUrl?: string };
type Charity = { id: string; title: string; description: string };
const api = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-beta-ten-t6mhx1k4pi.vercel.app/api/v1";

export default function Dashboard() {
  const [scores, setScores] = useState<Score[]>([]);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [setting, setSetting] = useState<Setting>(null);
  const [draw, setDraw] = useState<Draw>({ drawDate: null, prizePoolEstimate: 0 });
  const [winners, setWinners] = useState<Winner[]>([]);
  const [score, setScore] = useState(32);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("Choose a plan to unlock score entry.");
  const [loading, setLoading] = useState(true);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [contributionPercent, setContributionPercent] = useState(10);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  
  const token = typeof window === "undefined" ? "" : window.localStorage.getItem("digital-heroes-token") ?? "";
  const headers = { Authorization: `Bearer ${token}` };
  const active = subscription?.status === "ACTIVE";

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth?mode=login";
      return;
    }
    setDate(new Date().toISOString().slice(0, 10));
    Promise.all([
      fetch(`${api}/scores`, { headers }).then(async (response) => response.ok ? response.json() : { scores: [], restricted: response.status === 402 }),
      fetch(`${api}/subscriptions/status`, { headers }).then((response) => response.ok ? response.json() : { subscription: null }),
      fetch(`${api}/charities/my-setting`, { headers }).then((response) => response.ok ? response.json() : { setting: null }),
      fetch(`${api}/draws/upcoming`).then((response) => response.json()),
      fetch(`${api}/winners/my-winnings`, { headers }).then((response) => response.ok ? response.json() : { winners: [] }),
      fetch(`${api}/charities`).then((response) => response.json())
    ]).then(([scoreData, subscriptionData, settingData, drawData, winnerData, charityData]) => {
      setScores(scoreData.scores);
      setSubscription(subscriptionData.subscription);
      setSetting(settingData.setting);
      setDraw(drawData);
      setWinners(winnerData.winners);
      setCharities(charityData.charities);
      if (scoreData.restricted) setMessage("Activate a membership to enter scores and join the monthly draw.");
    }).finally(() => setLoading(false));
  }, [token]);

  async function addScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active) {
      setMessage("Activate a membership before saving scores.");
      return;
    }
    const response = await fetch(`${api}/scores`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ scoreValue: score, scoreDate: date })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message);
      return;
    }
    setScores((current) => [data.score, ...current].sort((a, b) => b.scoreDate.localeCompare(a.scoreDate)).slice(0, 5));
    setMessage("Score saved. Your draw entry is up to date.");
  }

  async function startCheckout(planType: "MONTHLY" | "YEARLY") {
    setMessage("Processing subscription...");
    const response = await fetch(`${api}/subscriptions/checkout`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ planType })
    });
    const data = await response.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else if (data.success && data.mock) {
      setMessage("Subscription activated successfully!");
      setSubscription(data.subscription);
    } else {
      setMessage(data.message ?? "Checkout is not available yet.");
    }
  }

  async function selectCharity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${api}/charities/select`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ charityId: selectedCharity, contributionPercentage: contributionPercent })
    });
    const data = await response.json();
    if (response.ok) {
      setSetting(data.setting);
      setShowCharityModal(false);
      setMessage("Charity updated successfully.");
    } else {
      setMessage(data.message ?? "Failed to update charity.");
    }
  }

  async function uploadProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(`${api}/winners/proof`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId: selectedWinnerId, proofImageUrl })
    });
    const data = await response.json();
    if (response.ok) {
      setShowProofModal(false);
      setProofImageUrl("");
      setMessage("Proof submitted successfully. Awaiting verification.");
      setWinners((current) => current.map((w) => w.id === selectedWinnerId ? { ...w, proofImageUrl } : w));
    } else {
      setMessage(data.message ?? "Failed to submit proof.");
    }
  }

  function logout() {
    localStorage.removeItem("digital-heroes-token");
    window.location.href = "/auth?mode=login";
  }

  const totalWon = winners.reduce((sum, winner) => sum + Number(winner.prizeAmount), 0);
  const days = draw.drawDate ? Math.max(0, Math.ceil((new Date(draw.drawDate).getTime() - Date.now()) / 86400000)) : null;

  if (loading) return <main className="dashboard-page dashboard-loading"><span className="status-dot" /> Loading your member space...</main>;

  return (
    <main className="dashboard-page">
      <nav className="nav-shell">
        <a className="brand" href="/"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a>
        <div className="dashboard-nav-actions">
          <a className="text-link" href="/">Back home <span>↗</span></a>
          <button className="logout-button" type="button" onClick={logout}>Log out</button>
        </div>
      </nav>

      <header className="dashboard-header">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> Member space</p>
          <h1>Your good<br /><em>in motion.</em></h1>
        </div>
        <div className="member-chip">
          <span className={active ? "status-dot" : "status-dot status-off"} />
          {active ? "Active member" : "Membership needed"}
          <strong>{subscription?.planType ?? "Choose a plan"}{subscription?.renewalDate ? ` · Renews ${new Date(subscription.renewalDate).toLocaleDateString("en-GB")}` : ""}</strong>
        </div>
      </header>

      <section className="member-guide">
        <div>
          <p className="panel-kicker">How to use Digital Heroes</p>
          <h2>Three steps to make<br /><em>your round count.</em></h2>
        </div>
        <ol>
          <li><strong>Subscribe</strong><span>Choose monthly or yearly membership.</span></li>
          <li><strong>Score</strong><span>Enter Stableford score 1–45 and round date.</span></li>
          <li><strong>Give &amp; play</strong><span>Select a charity and join the monthly draw.</span></li>
        </ol>
      </section>

      {!active && (
        <section className="plan-banner">
          <div>
            <p className="panel-kicker">Step 1 · Unlock member features</p>
            <h2>Subscribe. Score.<br /><em>Give back.</em></h2>
          </div>
          <div className="plan-actions">
            <button className="button button-primary" onClick={() => startCheckout("MONTHLY")}>Monthly <span>↗</span></button>
            <button className="button button-dark" onClick={() => startCheckout("YEARLY")}>Yearly · save <span>↗</span></button>
          </div>
        </section>
      )}

      <section className="dashboard-grid">
        <article className="dashboard-panel score-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Step 2 · Performance</p>
              <h2>Your latest rounds</h2>
            </div>
            <span className="panel-count">{scores.length}/5</span>
          </div>
          <p className="field-help">Stableford score: whole number from 1 to 45. Round date: the date you played.</p>
          <form className="score-form" onSubmit={addScore}>
            <label>Stableford score<input type="number" min="1" max="45" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
            <label>Round date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <button className="button button-primary" disabled={!active} type="submit">Save score <span>↗</span></button>
          </form>
          <p className="form-message">{message}</p>
          <div className="score-list">
            {scores.length ? scores.map((item) => (
              <div className="score-row" key={item.id}>
                <strong>{item.scoreValue}</strong>
                <span>Stableford</span>
                <time>{new Date(item.scoreDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time>
              </div>
            )) : <div className="empty-state">{active ? "No saved rounds yet. Add your first score above." : "Subscribe first, then your score form will unlock."}</div>}
          </div>
        </article>

        <aside className="dashboard-side">
          <article className="dashboard-panel charity-panel">
            <p className="panel-kicker">Step 3 · Your impact</p>
            <h2>{setting?.contributionPercentage ?? "10"}<span>%</span></h2>
            <p>{setting ? `Your membership supports ${setting.charity.title}.` : "Choose a charity to direct your membership impact."}</p>
            <button className="button button-light" onClick={() => setShowCharityModal(true)}>{setting ? "Change charity" : "Select charity"} <span>↗</span></button>
          </article>

          <article className="dashboard-panel draw-panel">
            <p className="panel-kicker">Monthly draw</p>
            <h2>{days ?? "--"} <small>days</small></h2>
            <p>Keep your five latest scores current to stay in the running.</p>
            <div className="draw-line">
              <span>Prize pool estimate</span>
              <strong>£{draw.prizePoolEstimate.toLocaleString()}</strong>
            </div>
          </article>
        </aside>
      </section>

      <section className="dashboard-bottom">
        <div>
          <p className="panel-kicker">Winnings</p>
          <h2>£{totalWon.toLocaleString()} won.<br /><em>{winners.length ? "Keep playing." : "Plenty to play for."}</em></h2>
        </div>
        <div className="winnings-note">
          <span className="large-arrow">↗</span>
          <p>{winners.length ? `${winners.length} winning tier · ${winners.map((winner) => winner.payoutStatus).join(", ")}` : "Three matching tiers. One shared purpose."}</p>
        </div>
        {winners.length > 0 && (
          <div className="winnings-list">
            {winners.map((winner) => (
              <div className="winner-row" key={winner.id}>
                <div>
                  <strong>{winner.matchType.replace("_", " ")}</strong>
                  <span>£{winner.prizeAmount}</span>
                </div>
                <div>
                  <span className={`status-badge ${winner.payoutStatus.toLowerCase()}`}>{winner.payoutStatus}</span>
                  {!winner.proofImageUrl && (
                    <button className="button button-light" onClick={() => { setSelectedWinnerId(winner.id); setShowProofModal(true); }}>
                      Upload proof <span>↗</span>
                    </button>
                  )}
                  {winner.proofImageUrl && <span className="proof-submitted">Proof submitted</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showCharityModal && (
        <div className="modal-overlay" onClick={() => setShowCharityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="panel-kicker">Select your charity</p>
              <h2>Choose where<br /><em>your impact goes.</em></h2>
              <button className="modal-close" onClick={() => setShowCharityModal(false)}>×</button>
            </div>
            <form onSubmit={selectCharity}>
              <label>
                Choose a charity
                <select value={selectedCharity} onChange={(e) => setSelectedCharity(e.target.value)} required>
                  <option value="">Select a charity...</option>
                  {charities.map((charity) => (
                    <option key={charity.id} value={charity.id}>{charity.title}</option>
                  ))}
                </select>
              </label>
              <label>
                Contribution percentage (minimum 10%)
                <input type="number" min="10" max="100" value={contributionPercent} onChange={(e) => setContributionPercent(Number(e.target.value))} required />
              </label>
              <button className="button button-primary" type="submit">Save charity selection <span>↗</span></button>
            </form>
          </div>
        </div>
      )}

      {showProofModal && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <p className="panel-kicker">Winner verification</p>
              <h2>Upload your<br /><em>score proof.</em></h2>
              <button className="modal-close" onClick={() => setShowProofModal(false)}>×</button>
            </div>
            <form onSubmit={uploadProof}>
              <label>
                Proof image URL
                <input 
                  type="url" 
                  value={proofImageUrl} 
                  onChange={(e) => setProofImageUrl(e.target.value)} 
                  placeholder="https://example.com/score-screenshot.jpg"
                  required 
                />
                <small className="field-help">Upload your score screenshot to an image host and paste the URL here.</small>
              </label>
              <button className="button button-primary" type="submit">Submit proof <span>↗</span></button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
