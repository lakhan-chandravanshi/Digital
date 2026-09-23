"use client";

import { useEffect, useState } from "react";

type Charity = { id: string; title: string; description: string; spotlightFlag: boolean };
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function CharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [search, setSearch] = useState("");
  const [percentage, setPercentage] = useState(10);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch(`${api}/charities`)
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }: { ok: boolean; data: { charities?: Charity[]; message?: string } }) => {
        if (!ok) { setMessage(data.message ?? "Charities are temporarily unavailable."); return; }
        setCharities(Array.isArray(data.charities) ? data.charities : []);
      })
      .catch(() => setMessage("Could not connect to the charities service."));
  }, []);
  const shown = charities.filter((charity) => `${charity.title} ${charity.description}`.toLowerCase().includes(search.toLowerCase()));
  async function choose(charityId: string) {
    const token = localStorage.getItem("digital-heroes-token");
    if (!token) { window.location.href = "/auth?mode=login"; return; }
    const response = await fetch(`${api}/charities/select`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ charityId, contributionPercentage: percentage }) });
    const data = await response.json(); setMessage(response.ok ? "Your charity preference is saved." : data.message);
  }
  return <main className="charities-page"><nav className="nav-shell"><a className="brand" href="/"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a><a className="nav-cta" href="/auth?mode=signup">Become a member <span>↗</span></a></nav><header className="charities-header"><p className="eyebrow"><span className="eyebrow-line" /> The directory</p><h1>Causes worth<br /><em>playing for.</em></h1><p>Every member chooses where their impact lands. Discover the organisations making good move.</p><div className="charity-filter"><input aria-label="Search charities" placeholder="Search causes..." value={search} onChange={(event) => setSearch(event.target.value)} /><label>Contribution <select value={percentage} onChange={(event) => setPercentage(Number(event.target.value))}><option value="10">10%</option><option value="20">20%</option><option value="30">30%</option><option value="50">50%</option><option value="100">100%</option></select></label></div><p className="form-message">{message}</p></header><section className="charity-grid">{shown.length ? shown.map((charity) => <article className="charity-card" key={charity.id}><span className="charity-card-mark">↗</span><p className="panel-kicker">{charity.spotlightFlag ? "Featured cause" : "Community cause"}</p><h2>{charity.title}</h2><p>{charity.description}</p><button className="text-link charity-choose" onClick={() => choose(charity.id)}>Choose this cause <span>↗</span></button></article>) : <p className="empty-state">Charities will appear here once the directory is seeded in Neon.</p>}</section></main>;
}
