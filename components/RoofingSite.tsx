"use client";
import { useCallback, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Phone,
  ShieldCheck,
  ScanLine,
  Wrench,
  Layers3,
  Check,
  MapPin,
  Star,
  Menu,
  X,
  ChevronDown,
  MoveUpRight,
  LockKeyhole,
  Settings2,
} from "lucide-react";
import { DEMO_MODE, SITE_CONFIG, ServiceItem } from "@/config/site";
import { trackCustomEvent } from "@/lib/tracking";
import { EstimateForm } from "./EstimateForm";
import { WhopCheckoutModal } from "./WhopCheckoutModal";
import { ContractorDemoPanel } from "./ContractorDemoPanel";
const serviceIcons = [ScanLine, Wrench, Layers3];
function Brand({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`brand ${light ? "brand-light" : ""}`}
      href="#top"
      aria-label={`${SITE_CONFIG.companyName} home`}
    >
      <span className="brand-icon">
        <ShieldCheck size={29} strokeWidth={1.6} />
      </span>
      <span>
        {SITE_CONFIG.shortName}
        <small>ROOFING & EXTERIORS</small>
      </span>
    </a>
  );
}
export function RoofingSite() {
  const finalBalanceRef = useRef<HTMLDetailsElement>(null);
  const [menu, setMenu] = useState(false),
    [service, setService] = useState<ServiceItem | null>(null),
    [admin, setAdmin] = useState(false);
  const closeCheckout = useCallback(() => setService(null), []),
    closeAdmin = useCallback(() => setAdmin(false), []);
  function book(item: ServiceItem) {
    trackCustomEvent("service_viewed", {
      service_id: item.id,
      category: item.category,
      price: item.price,
    });
    if (item.isDeposit)
      trackCustomEvent("deposit_started", {
        service_id: item.id,
        plan_id: item.planId || "demo",
        amount: item.price,
      });
    setService(item);
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div id="top" className="announcement">
        <span>
          <MapPin size={13} /> ROOTED IN AUSTIN. READY FOR TEXAS WEATHER.
        </span>
        <a href={`tel:${SITE_CONFIG.phoneHref}`}>
          Have a leak? Let’s talk <ArrowUpRight size={13} />
        </a>
      </div>
      <header className="header">
        <div className="container nav">
          <Brand />
          <nav
            className={menu ? "nav-links open" : "nav-links"}
            aria-label="Main navigation"
          >
            {[
              ["Services", "services"],
              ["Our approach", "approach"],
              ["Service area", "service-area"],
              ["Reviews", "reviews"],
            ].map(([label, id]) => (
              <a href={`#${id}`} key={id} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <a className="nav-phone" href={`tel:${SITE_CONFIG.phoneHref}`}>
            <Phone size={16} />
            {SITE_CONFIG.phone}
          </a>
          <a className="button small primary nav-cta" href="#estimate">
            Get a free estimate <ArrowUpRight size={16} />
          </a>
          <button
            className="menu-toggle icon-button"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow hero-eyebrow">
                <span className="green-dot" /> YOUR LOCAL ROOFING TEAM
              </div>
              <h1>
                Peace of mind.
                <br />
                From the
                <br /> <em>roof down.</em>
              </h1>
              <p>
                Your home deserves a roof you can count on. Honest advice, clear
                pricing, and craftsmanship built for whatever Texas brings.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#estimate">
                  Get my free estimate <ArrowUpRight size={18} />
                </a>
                <a className="text-link" href="#services">
                  Explore our services <ArrowRight size={16} />
                </a>
              </div>
              <div className="hero-assurance">
                <ShieldCheck size={22} />
                <span>
                  Local people. Clear commitments.
                  <small>
                    From your first inspection to the final walkthrough.
                  </small>
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <img
                className="hero-photo"
                src="/roofing-home.jpg"
                alt="A shingle-roofed home with gables, a wraparound porch, and a sunlit garden"
                fetchPriority="high"
              />
              <div className="photo-label">
                <span className="green-dot" /> A STRONGER ROOF STARTS WITH A
                PLAN
              </div>
              <div className="inspection-note">
                <span className="note-icon">
                  <ScanLine size={25} />
                </span>
                <div>
                  <small>NO GUESSWORK. JUST CLARITY.</small>
                  <strong>See your roof’s full story.</strong>
                  <p>21-point drone & attic inspection</p>
                </div>
                <button
                  aria-label="Book a roof inspection"
                  onClick={() => book(SITE_CONFIG.services[0])}
                >
                  <MoveUpRight size={22} />
                </button>
              </div>
              <span className="visual-caption">
                BUILT FOR THE PLACE YOU CALL HOME.
              </span>
            </div>
          </div>
        </section>
        <section className="trust-strip" aria-label="Our commitments">
          <div className="container trust-grid">
            <span>
              <ShieldCheck />
              Written scope & upfront pricing
            </span>
            <span>
              <ScanLine />
              Thorough, photo-backed inspections
            </span>
            <span>
              <Layers3 />
              Residential & commercial roofing
            </span>
            <span>
              <LockKeyhole />
              Secure checkout with Whop
            </span>
          </div>
        </section>
        <section className="section services" id="services">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">
                  01 / ROOFING, WITHOUT THE RUNAROUND
                </span>
                <h2>
                  The right help.
                  <br />
                  Right when you need it.
                </h2>
              </div>
              <p>
                A little maintenance or a fresh start.
                <br />
                Choose your next step, with the price
                <br />
                and the process clear from day one.
              </p>
            </div>
            <div className="service-grid">
              {SITE_CONFIG.services.map((item, index) => {
                const Icon = serviceIcons[index];
                return (
                  <article
                    className={`service-card ${index === 2 ? "featured" : ""}`}
                    key={item.id}
                  >
                    <div className="service-top">
                      <Icon size={29} strokeWidth={1.4} />
                      <span className="service-index">
                        0{index + 1} / {item.category.toUpperCase()}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <ul className="feature-list">
                      {item.features.map((feature) => (
                        <li key={feature}>
                          <Check size={15} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="service-price">
                      <strong>${item.price}</strong>
                      <span>
                        {item.isDeposit
                          ? "project deposit"
                          : index === 0
                            ? "flat inspection fee"
                            : "flat-rate repair"}
                      </span>
                    </div>
                    <button
                      className={`button full ${index === 2 ? "orange" : "outline"}`}
                      onClick={() => book(item)}
                    >
                      {item.isDeposit
                        ? "Reserve my replacement"
                        : index === 0
                          ? "Book an inspection"
                          : "Book a repair"}
                      <ArrowUpRight size={18} />
                    </button>
                    {item.isDeposit && (
                      <small className="deposit-note">
                        Every dollar goes toward your new roof.
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="services-footnote">
              Not sure what your roof needs?{" "}
              <a href="#estimate">
                Tell us what’s going on. We’ll help you figure it out.{" "}
                <ArrowRight size={14} />
              </a>
            </p>
          </div>
        </section>
        <section className="approach section" id="approach">
          <div className="container approach-grid">
            <div className="approach-title">
              <span className="eyebrow">02 / GOOD WORK. NO SURPRISES.</span>
              <h2>
                From “what if”
                <br />
                to <em>all taken care of.</em>
              </h2>
              <p>
                Roofing shouldn’t feel complicated. We keep you informed, your
                property respected, and the next step clear.
              </p>
              <a className="text-link" href="#estimate">
                Let’s make a plan <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="steps">
              {[
                {
                  title: "Start with the whole picture.",
                  text: "Book an inspection or request an estimate. We look closely, listen first, and explain what your roof actually needs.",
                },
                {
                  title: "Agree on a clear plan.",
                  text: "Review the scope, materials, and price. If you’re replacing, your $500 deposit is applied to the full project.",
                },
                {
                  title: "Feel good about the finish.",
                  text: "We complete the work and walk it through with you. Settle the remaining balance through a secure Whop invoice.",
                },
              ].map((step, i) => {
                const content = (
                  <>
                    <span className="step-number">0{i + 1}</span>
                    <span className="step-copy">
                      <strong className="step-title">{step.title}</strong>
                      <span className="step-description">{step.text}</span>
                    </span>
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </>
                );
                return i === 0 ? (
                  <button
                    type="button"
                    className="step"
                    key={step.title}
                    onClick={() => book(SITE_CONFIG.services[0])}
                  >
                    {content}
                  </button>
                ) : (
                  <a
                    className="step"
                    key={step.title}
                    href={i === 1 ? "#estimate" : "#final-balance"}
                    onClick={
                      i === 2
                        ? () => {
                            if (finalBalanceRef.current)
                              finalBalanceRef.current.open = true;
                          }
                        : undefined
                    }
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </div>
        </section>
        <section className="financing">
          <div className="container financing-grid">
            <div className="financing-symbol">
              <Layers3 size={40} strokeWidth={1} />
            </div>
            <div>
              <span className="eyebrow">MORE WAYS TO MOVE FORWARD</span>
              <h2>{SITE_CONFIG.financing.headline}</h2>
              <p>{SITE_CONFIG.financing.subheadline}</p>
            </div>
            <div className="payment-brands">
              <span>Klarna.</span>
              <span>
                afterpay <span aria-hidden="true">↔</span>
              </span>
              <span>splitit</span>
              <small>Subject to provider approval and availability.</small>
            </div>
          </div>
        </section>
        <section className="section area" id="service-area">
          <div className="container area-grid">
            <div>
              <span className="eyebrow">03 / NEIGHBORS HELPING NEIGHBORS</span>
              <h2>
                Austin roots.
                <br />
                Central Texas reach.
              </h2>
              <p>
                From a city bungalow to a Hill Country home, we’re here to help
                protect your corner of Texas.
              </p>
              <div className="city-list">
                {SITE_CONFIG.serviceArea.cities.map((city) => (
                  <span key={city}>
                    <MapPin size={14} />
                    {city}
                  </span>
                ))}
              </div>
              <div className="area-inquiry">
                <p>Have a project in mind? Tell us about your property.</p>
                <a className="button primary" href="#estimate">
                  Request a free estimate <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
            <div
              className="area-art"
              role="img"
              aria-label="Illustration of the six Central Texas cities served, centered around Austin"
            >
              <div className="map-grid" />
              <div className="map-road road-one" />
              <div className="map-road road-two" />
              <div className="map-river" />
              <div className="coverage-ring ring-one" />
              <div className="coverage-ring ring-two" />
              <span className="map-city georgetown">
                <i />
                Georgetown
              </span>
              <span className="map-city roundrock">
                <i />
                Round Rock
              </span>
              <span className="map-city cedar">
                <i />
                Cedar Park
              </span>
              <span className="map-city pflugerville">
                <i />
                Pflugerville
              </span>
              <span className="map-city lakeway">
                <i />
                Lakeway
              </span>
              <div className="austin-pin">
                <ShieldCheck size={24} />
                <strong>Austin</strong>
              </div>
              <span className="map-key">
                <span className="green-dot" /> OUR CENTRAL TEXAS COMMUNITY
              </span>
              <small className="map-disclaimer">
                Illustrative service area · contact us about your project
              </small>
            </div>
          </div>
        </section>
        <section className="section reviews" id="reviews">
          <div className="container">
            <div className="section-header">
              <div>
                <span className="eyebrow">
                  04 / HOMEOWNERS, IN THEIR OWN WORDS
                </span>
                <h2>
                  Good roofs.
                  <br />
                  Even better relationships.
                </h2>
              </div>
              <p className="demo-editorial">
                Sample testimonials from the bounty brief.
                <br />
                Replace with verified customer reviews
                <br />
                before launching a contractor’s website.
              </p>
            </div>
            <div className="review-grid">
              {SITE_CONFIG.reviews.map((review, i) => (
                <figure className="review-card" key={review.author}>
                  <div className="stars" aria-label="Sample 5-star review">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <blockquote>“{review.quote}”</blockquote>
                  <figcaption>
                    <span className={`avatar avatar-${i}`}>
                      {review.author
                        .split(" ")
                        .map((x) => x[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>{review.author}</strong>
                      <small>
                        {review.city} · {review.project}
                      </small>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="credential-note">
              <ShieldCheck size={19} />
              <span>Contractor credentials belong here.</span>
              <small>
                Verify license, insurance, and manufacturer certifications
                before publishing. The supplied brand is illustrative.
              </small>
            </div>
          </div>
        </section>
        <section className="section faq">
          <div className="container faq-grid">
            <div>
              <span className="eyebrow">
                A FEW THINGS YOU MIGHT BE WONDERING
              </span>
              <h2>
                Clear answers.
                <br />
                Before we start.
              </h2>
              <p>
                Still have a question?
                <br />
                <a href={`tel:${SITE_CONFIG.phoneHref}`}>
                  Give us a call <ArrowUpRight size={14} />
                </a>
              </p>
            </div>
            <div className="faq-list">
              {SITE_CONFIG.faqs.map((faq) => (
                <details
                  key={faq.question}
                  id={faq.id}
                  ref={faq.id === "final-balance" ? finalBalanceRef : undefined}
                >
                  <summary>
                    {faq.question}
                    <ChevronDown size={18} />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="section estimate" id="estimate">
          <div className="container estimate-grid">
            <div className="estimate-copy">
              <span className="eyebrow">05 / YOUR HOME. OUR NEXT PROJECT.</span>
              <h2>
                Let’s put a<br />
                good roof
                <br />
                <em>over your head.</em>
              </h2>
              <p>
                A question, a leak, or a whole new roof.
                <br />
                We’re ready when you are.
              </p>
              <a
                href={`tel:${SITE_CONFIG.phoneHref}`}
                className="estimate-phone"
              >
                <Phone size={25} />
                <span>
                  <small>PREFER TO TALK IT THROUGH?</small>
                  {SITE_CONFIG.phone}
                </span>
              </a>
              <div className="estimate-points">
                <span>
                  <Check size={16} /> Straightforward advice
                </span>
                <span>
                  <Check size={16} /> No-obligation estimates
                </span>
                <span>
                  <Check size={16} /> A local team that listens
                </span>
              </div>
            </div>
            <EstimateForm />
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div>
              <Brand light />
              <p>
                A better roof. A better way.
                <br />
                Proudly serving Central Texas.
              </p>
            </div>
            <div>
              <span className="footer-label">LET’S CONNECT</span>
              <a href={`tel:${SITE_CONFIG.phoneHref}`}>{SITE_CONFIG.phone}</a>
              <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
            </div>
            <div>
              <span className="footer-label">FIND YOUR NEXT STEP</span>
              <a href="#services">Explore services</a>
              <a href="#estimate">Request an estimate</a>
              <button
                className="contractor-link"
                onClick={() => setAdmin(true)}
              >
                <Settings2 size={13} /> Create final invoice
              </button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {SITE_CONFIG.companyName}
            </span>
            <span>
              {SITE_CONFIG.demoBrand
                ? "White-label demo · illustrative business & reviews"
                : SITE_CONFIG.licenseNumber}
            </span>
            <span>
              Payments powered by <strong>whop</strong>
            </span>
          </div>
        </div>
      <div className="contractor-footer-links"><a href="/admin/leads">Estimate requests</a><a href="/admin/tracking">Event activity</a><a href="/admin/invoices">Project billing</a></div>
      </footer>
      {DEMO_MODE && (
        <div className="demo-badge">
          <span className="green-dot" /> TEMPLATE DEMO{" "}
          <span>· No payments or leads sent</span>
        </div>
      )}
      {service && (
        <WhopCheckoutModal service={service} onClose={closeCheckout} />
      )}{" "}
      {admin && <ContractorDemoPanel onClose={closeAdmin} />}
    </>
  );
}
