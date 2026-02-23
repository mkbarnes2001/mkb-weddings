import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

export function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact | MKB Weddings</title>
        <meta
          name="description"
          content="Get in touch with MKB Weddings to check availability, pricing and wedding photography packages across Northern Ireland and Ireland."
        />
        <link rel="canonical" href="https://www.mkbweddings.co.uk/contact" />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Simple hero */}
        <section className="px-6 pt-24 pb-16 max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 mb-4">
            Contact MKB Weddings
          </h1>
          <p className="text-neutral-600 text-lg max-w-3xl mx-auto">
            Check availability, pricing, and wedding photography coverage across Northern Ireland and Ireland.
          </p>
        </section>

        <section className="px-6 pb-24 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <h2 className="text-2xl font-serif text-neutral-900 mb-4">
                Send a message
              </h2>
              <p className="text-neutral-600 mb-8">
                Use the form to tell us your date, venue, and what matters most to you.
              </p>

              <iframe
                title="Contact form"
                height="759"
                style={{ width: "100%", border: 0 }}
                src="https://app.studioninja.co/contactform/parser/0a800fc9-82a4-1a61-8182-f546140b694f/0a800fc8-82a4-122c-8183-0a866445138a"
                loading="lazy"
              />
            </div>

            {/* Info */}
            <div>
              <h2 className="text-2xl font-serif text-neutral-900 mb-4">
                Contact details
              </h2>
              <p className="text-neutral-600 mb-8">
                Prefer to reach out directly?
              </p>

              <div className="space-y-6 mb-10">
                <InfoRow
                  icon={<Mail className="w-5 h-5" />}
                  label="Email"
                  value="mark@mkbweddings.com"
                  href="mailto:mark@mkbweddings.com"
                />
                <InfoRow
                  icon={<Phone className="w-5 h-5" />}
                  label="Phone"
                  value="+44 (0) 7546 456077"
                  href="tel:+447546456077"
                />
                <InfoRow
                  icon={<MapPin className="w-5 h-5" />}
                  label="Service area"
                  value="Northern Ireland & Ireland"
                />
              </div>

              <div className="border-t border-neutral-200 pt-8">
                <h3 className="text-xl font-serif text-neutral-900 mb-4">
                  Follow our work
                </h3>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com/mkbweddings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
                  >
                    <Instagram className="w-5 h-5" /> Instagram
                  </a>
                  <a
                    href="https://facebook.com/mkbweddings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
                  >
                    <Facebook className="w-5 h-5" /> Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-900">
        {icon}
      </div>
      <div>
        <div className="text-neutral-900 font-medium">{label}</div>
        {href ? (
          <a href={href} className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4">
            {value}
          </a>
        ) : (
          <div className="text-neutral-600">{value}</div>
        )}
      </div>
    </div>
  );
}