import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ContactRound,
  Globe2,
  Menu,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  getWedPlannedProduct,
  WEDPLANNED_PRODUCTS,
  type WedPlannedProduct,
  type WedPlannedProductSlug,
} from "./products";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SITE_ORIGIN = "https://wedplanned.com";
const PROFESSIONAL_APP_URL = "https://admin.mkbweddings.co.uk/admin";

const productIcons = {
  wednav: BriefcaseBusiness,
  wedcrm: ContactRound,
  wedstudio: Globe2,
  wedstore: ShoppingBag,
} satisfies Record<WedPlannedProductSlug, typeof BriefcaseBusiness>;

function ProductWordmark({
  product,
  compact = false,
}: {
  product: WedPlannedProduct;
  compact?: boolean;
}) {
  return (
    <span
      className={`wp-product-wordmark wp-product-wordmark--${product.slug}`}
      aria-label={product.name}
    >
      {compact ? product.compactName : product.name}
    </span>
  );
}

function PageMeta({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}) {
  const canonical = `${SITE_ORIGIN}${path === "/" ? "/" : path.replace(/\/+$/, "")}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      {noIndex ? <meta name="robots" content="noindex, follow" /> : null}
    </Helmet>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

function Brand() {
  return (
    <Link to="/" className="wp-brand" aria-label="WedPlanned home">
      <span className="wp-brand__wed">Wed</span>
      <span className="wp-brand__planned">Planned</span>
    </Link>
  );
}

function MarketingLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="wp-site">
      <header className="wp-header">
        <div className="wp-shell wp-header__inner">
          <Brand />

          <nav className="wp-desktop-nav" aria-label="Primary navigation">
            <NavLink to="/products">Products</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/about">About</NavLink>
          </nav>

          <div className="wp-header__actions">
            <Link to="/sign-in" className="wp-text-link">
              Sign in
            </Link>
            <Link to="/get-started" className="wp-button wp-button--dark">
              Get started
            </Link>
          </div>

          <button
            type="button"
            className="wp-mobile-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen ? (
          <nav className="wp-mobile-nav" aria-label="Mobile navigation">
            <div className="wp-shell">
              <NavLink to="/products">Products</NavLink>
              <NavLink to="/pricing">Pricing</NavLink>
              <NavLink to="/about">About</NavLink>
              <NavLink to="/sign-in">Sign in</NavLink>
              <NavLink to="/get-started" className="wp-button wp-button--dark">
                Get started
              </NavLink>
            </div>
          </nav>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="wp-footer">
        <div className="wp-shell wp-footer__grid">
          <div>
            <Brand />
            <p>
              One connected operating platform for wedding professionals.
            </p>
          </div>

          <div>
            <strong>Products</strong>
            {WEDPLANNED_PRODUCTS.map((product) => (
              <Link key={product.slug} to={`/products/${product.slug}`}>
                {product.name}
              </Link>
            ))}
          </div>

          <div>
            <strong>WedPlanned</strong>
            <Link to="/products">Product overview</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
            <Link to="/get-started">Get started</Link>
          </div>

          <div>
            <strong>Access</strong>
            <Link to="/sign-in">Professional sign in</Link>
          </div>
        </div>

        <div className="wp-shell wp-footer__bottom">
          <span>© {new Date().getFullYear()} WedPlanned</span>
          <span>Built for wedding businesses.</span>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="wp-section-intro">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
    </header>
  );
}

function ProductCard({ product }: { product: WedPlannedProduct }) {
  const Icon = productIcons[product.slug];

  return (
    <Link
      to={`/products/${product.slug}`}
      className={`wp-product-card wp-product-card--${product.slug}`}
    >
      <div className="wp-product-card__top">
        <span className="wp-product-card__icon">
          <Icon />
        </span>
        <ProductWordmark product={product} />
      </div>
      <p className="wp-product-card__purpose">{product.purpose}</p>
      <span>{product.summary}</span>
      <strong>
        Explore {product.name}
        <ArrowRight />
      </strong>
    </Link>
  );
}

function HomePage() {
  return (
    <>
      <PageMeta
        title="WedPlanned | One Platform for Wedding Professionals"
        description="Run your wedding business through one connected platform with WedNav, WedCRM, WedStudio and WedStore."
        path="/"
      />

      <section className="wp-hero">
        <div className="wp-shell wp-hero__grid">
          <div className="wp-hero__copy">
            <p className="wp-eyebrow">The wedding-business operating platform</p>
            <h1>
              Run the whole business.
              <span>Keep everything connected.</span>
            </h1>
            <p className="wp-hero__lead">
              WedPlanned brings business operations, client management,
              content, galleries and commerce together without turning them
              into disconnected systems.
            </p>
            <div className="wp-hero__actions">
              <Link to="/products" className="wp-button wp-button--dark">
                Explore the platform
                <ArrowRight />
              </Link>
              <Link to="/get-started" className="wp-button wp-button--light">
                Get started
              </Link>
            </div>
          </div>

          <div className="wp-platform-map" aria-label="WedPlanned product suite">
            <div className="wp-platform-map__centre">
              <span className="wp-brand__wed">Wed</span>
              <span className="wp-brand__planned">Planned</span>
              <small>One connected business</small>
            </div>

            {WEDPLANNED_PRODUCTS.map((product) => (
              <Link
                key={product.slug}
                to={`/products/${product.slug}`}
                className={`wp-platform-node wp-platform-node--${product.slug}`}
              >
                <ProductWordmark product={product} />
                <small>{product.purpose}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-section--soft">
        <div className="wp-shell">
          <SectionIntro
            eyebrow="Four focused products"
            title="Different jobs. One business."
            description="Each area has a clear role, while the underlying customer, Job, business and content relationships stay connected."
          />

          <div className="wp-product-grid">
            {WEDPLANNED_PRODUCTS.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section">
        <div className="wp-shell wp-story-grid">
          <div>
            <p className="wp-eyebrow">Start in WedNav</p>
            <h2>Your business home, not another dashboard.</h2>
          </div>

          <div>
            <p>
              WedNav is the starting point for the professional workspace. It
              owns the shared business profile, services, suppliers, team and
              workspace configuration, then directs you into the specialist
              product for the job at hand.
            </p>
            <Link to="/products/wednav" className="wp-inline-link">
              See how WedNav fits together
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="wp-section wp-section--dark">
        <div className="wp-shell wp-cta">
          <div>
            <p className="wp-eyebrow">WedPlanned foundation</p>
            <h2>Built around the way a wedding business actually works.</h2>
          </div>
          <Link to="/get-started" className="wp-button wp-button--white">
            Get started
            <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}

function ProductsPage() {
  return (
    <>
      <PageMeta
        title="Products | WedPlanned"
        description="Explore WedNav, WedCRM, WedStudio and WedStore — four connected products for running a wedding business."
        path="/products"
      />

      <section className="wp-page-hero">
        <div className="wp-shell">
          <p className="wp-eyebrow">Products</p>
          <h1>Four clear workspaces. One connected platform.</h1>
          <p>
            Choose the area that matches the work you are doing without
            fragmenting the business underneath it.
          </p>
        </div>
      </section>

      <section className="wp-section wp-section--soft">
        <div className="wp-shell">
          <div className="wp-product-grid">
            {WEDPLANNED_PRODUCTS.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section">
        <div className="wp-shell wp-connection">
          <SectionIntro
            eyebrow="Connected by design"
            title="No duplicate client, content or business worlds."
            description="The products provide focus at the interface level while WedPlanned preserves the relationships between the business, its clients, its work and its output."
          />

          <div className="wp-connection__flow">
            <span>WedNav</span>
            <ArrowRight />
            <span>WedCRM</span>
            <ArrowRight />
            <span>WedStudio</span>
            <ArrowRight />
            <span>WedStore</span>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductPage() {
  const { slug = "" } = useParams();
  const product = useMemo(() => getWedPlannedProduct(slug), [slug]);

  if (!product) {
    return <NotFoundPage />;
  }

  const Icon = productIcons[product.slug];

  return (
    <>
      <PageMeta
        title={`${product.name} | WedPlanned`}
        description={`${product.summary} ${product.detail}`}
        path={`/products/${product.slug}`}
      />

      <section className={`wp-product-hero wp-product-hero--${product.slug}`}>
        <div className="wp-shell wp-product-hero__grid">
          <div>
            <ProductWordmark product={product} compact />
            <p className="wp-eyebrow">{product.purpose}</p>
            <h1>{product.name}</h1>
            <p>{product.detail}</p>
            <div className="wp-hero__actions">
              <Link to="/get-started" className="wp-button wp-button--dark">
                Get started
                <ArrowRight />
              </Link>
              <Link to="/products" className="wp-button wp-button--light">
                All products
              </Link>
            </div>
          </div>

          <div className="wp-product-hero__mark" aria-hidden="true">
            <Icon />
            <ProductWordmark product={product} compact />
          </div>
        </div>
      </section>

      <section className="wp-section">
        <div className="wp-shell wp-capability-layout">
          <SectionIntro
            eyebrow={`${product.name} capabilities`}
            title={product.summary}
            description="A focused product surface within the wider WedPlanned operating platform."
          />

          <div className="wp-capability-list">
            {product.capabilities.map((capability) => (
              <div key={capability}>
                <Check />
                <span>{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-section--soft">
        <div className="wp-shell wp-next-products">
          <SectionIntro
            eyebrow="Connected platform"
            title="Keep moving without leaving the business behind."
            description="The other WedPlanned products remain distinct, but they operate around the same business and client journey."
          />

          <div className="wp-product-grid wp-product-grid--three">
            {WEDPLANNED_PRODUCTS.filter(
              (candidate) => candidate.slug !== product.slug,
            ).map((candidate) => (
              <ProductCard key={candidate.slug} product={candidate} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PricingPage() {
  return (
    <>
      <PageMeta
        title="Pricing | WedPlanned"
        description="WedPlanned pricing foundation for the connected WedNav, WedCRM, WedStudio and WedStore platform."
        path="/pricing"
      />

      <section className="wp-page-hero">
        <div className="wp-shell">
          <p className="wp-eyebrow">Pricing</p>
          <h1>Simple product structure first. Commercial plans next.</h1>
          <p>
            WedPlanned pricing and subscription options are being prepared.
            This foundation deliberately avoids publishing placeholder prices
            before the commercial model is finalised.
          </p>
        </div>
      </section>

      <section className="wp-section">
        <div className="wp-shell">
          <div className="wp-pricing-foundation">
            <strong>One connected platform</strong>
            <h2>WedNav + WedCRM + WedStudio + WedStore</h2>
            <p>
              Future plans will be built around the connected product suite,
              with clear entitlement and onboarding boundaries.
            </p>
            <Link to="/get-started" className="wp-button wp-button--dark">
              Register interest
              <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <PageMeta
        title="About | WedPlanned"
        description="WedPlanned is a connected operating platform designed around the workflow of professional wedding businesses."
        path="/about"
      />

      <section className="wp-page-hero">
        <div className="wp-shell">
          <p className="wp-eyebrow">About WedPlanned</p>
          <h1>Wedding-business software should understand the whole business.</h1>
          <p>
            WedPlanned is being built as a connected operating platform rather
            than a collection of unrelated tools.
          </p>
        </div>
      </section>

      <section className="wp-section">
        <div className="wp-shell wp-story-grid">
          <div>
            <h2>One business context.</h2>
          </div>
          <div>
            <p>
              A lead can become a client. A client can become a Job. A Job can
              create content, a gallery and a store opportunity. The software
              should preserve those relationships instead of asking the
              business to recreate them in separate systems.
            </p>
            <p>
              That principle is why WedPlanned has four distinct product
              surfaces with one shared operating model underneath.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function SignInPage() {
  return (
    <>
      <PageMeta
        title="Professional Sign In | WedPlanned"
        description="Access the WedPlanned professional workspace."
        path="/sign-in"
        noIndex
      />

      <section className="wp-access-page">
        <div className="wp-access-card">
          <Brand />
          <p className="wp-eyebrow">Professional access</p>
          <h1>Sign in to your workspace.</h1>
          <p>
            Existing professional accounts continue into the protected
            WedPlanned Admin application.
          </p>
          <a
            href={PROFESSIONAL_APP_URL}
            className="wp-button wp-button--dark"
          >
            Continue to sign in
            <ArrowRight />
          </a>
        </div>
      </section>
    </>
  );
}

function GetStartedPage() {
  return (
    <>
      <PageMeta
        title="Get Started | WedPlanned"
        description="The WedPlanned onboarding route is ready for the future professional signup experience."
        path="/get-started"
      />

      <section className="wp-access-page">
        <div className="wp-access-card wp-access-card--wide">
          <p className="wp-eyebrow">Get started</p>
          <h1>Your route into WedPlanned.</h1>
          <p>
            The public onboarding boundary is now established. Account
            creation, plan selection and billing will be connected here in a
            later commercial release rather than being simulated before those
            contracts are ready.
          </p>

          <div className="wp-get-started-products">
            {WEDPLANNED_PRODUCTS.map((product) => (
              <ProductWordmark
                key={product.slug}
                product={product}
                compact
              />
            ))}
          </div>

          <Link to="/products" className="wp-button wp-button--dark">
            Explore the products
            <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <PageMeta
        title="Page Not Found | WedPlanned"
        description="The requested WedPlanned page could not be found."
        path="/404"
        noIndex
      />

      <section className="wp-access-page">
        <div className="wp-access-card">
          <p className="wp-eyebrow">404</p>
          <h1>That page is not part of WedPlanned.</h1>
          <Link to="/" className="wp-button wp-button--dark">
            Return home
          </Link>
        </div>
      </section>
    </>
  );
}

function WedPlannedRoutes() {
  return (
    <MarketingLayout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/get-started" element={<GetStartedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MarketingLayout>
  );
}

export default function WedPlannedApp() {
  return (
    <BrowserRouter>
      <WedPlannedRoutes />
    </BrowserRouter>
  );
}
