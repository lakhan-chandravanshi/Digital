const steps = [
  ["01", "Play your round", "Add your latest Stableford scores. Your five most recent rounds keep your entry current."],
  ["02", "Back a cause", "Choose a charity and direct at least 10% of your membership to work that matters."],
  ["03", "Share the upside", "Every month, members enter a transparent draw with three ways to match and win."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav-shell">
        <a className="brand" href="#top"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a>
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#impact">Impact</a><a href="#membership">Membership</a></div>
        <a className="nav-cta" href="/auth?mode=login">Sign in <span>↗</span></a>
      </nav>
      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> Better rounds. Bigger impact.</p><h1>Play for<br /><em>something</em> bigger.</h1><p className="hero-lede">A new kind of golf membership where every round supports a cause, and every month brings a chance to win.</p><div className="hero-actions"><a className="button button-primary" href="/auth?mode=signup">Become a member <span>↗</span></a><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div></div>
        <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="impact-core"><span>10%</span><small>minimum<br />to charity</small></div><div className="art-note note-top"><span className="note-dot" /> Monthly draw</div><div className="art-note note-bottom">Your membership<br /><strong>moves good forward.</strong></div></div>
        <div className="hero-foot"><span>Est. 2026</span><span>For players with purpose</span><span>Scroll to explore ↓</span></div>
      </section>
      <section className="impact-strip" id="impact"><div className="impact-intro"><p className="eyebrow">The idea</p><h2>Good can be<br /><em>part of the game.</em></h2></div><div className="impact-stat"><strong>£24.8k</strong><span>already pledged by our<br />early community</span></div><div className="impact-copy"><p>Digital Heroes connects the joy of playing with the power of giving. You bring the score. We help it travel further.</p><a className="text-link dark-link" href="#how-it-works">Meet the charities <span>↗</span></a></div></section>
      <section className="steps-section" id="how-it-works"><div className="section-heading"><p className="eyebrow">Simple by design</p><h2>One membership.<br /><em>Three ways to make a difference.</em></h2></div><div className="steps-grid">{steps.map(([number, title, text]) => <article className="step" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p><span className="step-arrow">↗</span></article>)}</div></section>
      <section className="membership" id="membership"><div><p className="eyebrow">Ready when you are</p><h2>Make your next round<br /><em>count for more.</em></h2></div><div className="membership-actions"><p>Monthly and annual memberships.<br />Cancel whenever you need.</p><a className="button button-light" href="/auth?mode=signup">Start your membership <span>↗</span></a></div></section>
      <footer><a className="brand" href="#top"><span className="brand-mark">D</span>digital<span className="brand-dot">.</span>heroes</a><span>Play with purpose · 2026</span><span>Built for the good in the game.</span></footer>
    </main>
  );
}
