import '../styles/Hero.css';

function Hero() {
  const features = [
    'Daily timesheet with break tracking',
    'Leave balance & deduction management',
    'Salary, advance & bonus records',
    'Company asset registry',
  ];

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-brand">
          <span className="hero-logo">
            AGENCY <span className="accent">CRM</span>
          </span>
          <span className="hero-tagline">MANAGEMENT SYSTEM · v1.0</span>
        </div>

        <h1 className="hero-heading">
          Your agency.
          <br />
          All in <span className="accent">one place.</span>
        </h1>

        <p className="hero-subtext">
          Timesheets, leaves, salaries, and assets — built for how your team actually works.
        </p>

        <ul className="hero-features">
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Hero;
