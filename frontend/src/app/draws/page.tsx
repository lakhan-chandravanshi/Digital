"use client";

import { useEffect, useState } from "react";

type Draw = { id: string; drawDate: string; winningNumbers: number[]; totalPoolAmount: string; rolloverAmount: string; drawLogic: string };
const api = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-beta-ten-t6mhx1k4pi.vercel.app/api/v1";

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${api}/draws/history`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) {
          setDraws(Array.isArray(data.draws) ? data.draws : []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="charities-page"><nav className="nav-shell"><a className="brand" href="/"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a><a className="nav-cta" href="/auth?mode=signup">Become a member <span>↗</span></a></nav><div className="dashboard-loading"><span className="status-dot" /> Loading draw history...</div></main>;

  return (
    <main className="charities-page">
      <nav className="nav-shell">
        <a className="brand" href="/"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a>
        <a className="nav-cta" href="/auth?mode=signup">Become a member <span>↗</span></a>
      </nav>
      
      <header className="charities-header">
        <p className="eyebrow"><span className="eyebrow-line" /> The draws</p>
        <h1>Past results<br /><em>& winners.</em></h1>
        <p>Monthly prize draws with three matching tiers. See the winning numbers and prize pool distribution from previous draws.</p>
      </header>

      <section className="charity-grid">
        {draws.length ? draws.map((draw) => (
          <article className="charity-card" key={draw.id}>
            <span className="charity-card-mark">🎯</span>
            <p className="panel-kicker">{draw.drawLogic === "WEIGHTED" ? "Algorithmic draw" : "Random draw"}</p>
            <h2>{new Date(draw.drawDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</h2>
            <div className="draw-numbers">
              {draw.winningNumbers.map((num, idx) => (
                <span key={idx} className="number-ball">{num}</span>
              ))}
            </div>
            <div className="draw-details">
              <span>Prize pool: £{Number(draw.totalPoolAmount).toLocaleString()}</span>
              {Number(draw.rolloverAmount) > 0 && <span>Rollover: £{Number(draw.rolloverAmount).toLocaleString()}</span>}
            </div>
          </article>
        )) : <p className="empty-state">No draws have been published yet. Draws are run monthly by the admin.</p>}
      </section>
    </main>
  );
}
