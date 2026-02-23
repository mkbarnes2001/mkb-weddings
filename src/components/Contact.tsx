import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

import heroImage1 from "figma:asset/56c087b2e44825658578c4eebea8003fc82789e5.png";

export function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact | MKB Weddings</title>
        <meta
          name="description"
          content="Get in touch with MKB Weddings to check availability, pricing and wedding photography packages across Northern Ireland, Donegal, Monaghan & Cavan."
        />
        {/* IMPORTANT: no robots noindex here */}
      </Helmet>

      <div className="-mt-20 min-h-screen">
        {/* ---------- Hero ---------- */}
        <section className="relative h-[70vh] overflow-hidden">
          <div className="absolute inset-0">
            <ImageWithFallback
              src={heroImage1}
              alt="Contact MKB Weddings"
              className="w-full h-full object-cover object-center"
              style={{ objectPosition: "center 40%" }}
            />
            <div className="absolute inset-0 bg-black/45" />
          </div>

          <div className="absolute inset-0 flex items-end justify-center pb-32">
            <div className="text-center text-white px-6 max-w-5xl mx-auto w-full">
              <h1 className="tagline text-white mb-4">Get in Touch</h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Ready to book your wedding photography? We&apos;d love to hear about
                your day and how we can capture it beautifully.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Main Content ---------- */}
        <section className="py-20 px-6 md:px-20 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Contact Form */}
            <div>
              <h2 className="mb-6">Send Us a Message</h2>
              <p className="text-foreground/60 mb-4">
                Fill out the form below to check availability and discuss your
                wedding photography needs.
              </p>
              <p className="text-primary mb-10 font-medium">
                Most couples receive a reply within 24 hours.
              </p>

              <iframe
                height="759"
                style={{ minWidth: "100%", maxWidth: "1260px", border: 0 }}
                id="sn-form-wsgz3"
                src="https://app.studioninja.co/contactform/parser/0a800fc9-82a4-1a61-8182-f546140b694f/0a800fc8-82a4-122c-8183-0a866445138a"
                allowFullScreen
              />
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="mb-6">Contact Information</h2>
              <p className="text-foreground/60 mb-8">
                Prefer to reach out directly? Here are all the ways you can get
                in touch.
              </p>

              <div className="space-y-6 mb-12">
                <ContactItem
                  icon={<Mail size={20} />}
                  title="Email"
                  value="mark@mkbweddings.com"
                  link="mailto:mark@mkbweddings.com"
                />
                <ContactItem
                  icon={<Phone size={20} />}
                  title="Phone"
                  value="+44 (0) 7546 456077"
                  link="tel:+447546456077"
                />
                <ContactItem
                  icon={<MapPin size={20} />}
                  title="Service Area"
                  value="Northern Ireland & destination weddings"
                />
              </div>

              <div className="border-t border-primary/20 pt-8">
                <h3 className="text-2xl mb-4">Follow Our Work</h3>
                <div className="flex gap-4">
                  <SocialLink
                    href="https://instagram.com/mkbweddings"
                    icon={<Instagram size={20} />}
                  />
                  <SocialLink
                    href="https://facebook.com/mkbweddings"
                    icon={<Facebook size={20} />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Small Helpers ---------- */

function ContactItem({
  icon,
  title,
  value,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  link?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-secondary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="mb-1">{title}</h3>
        {link ? (
          <a href={link} className="text-foreground/60 hover:text-primary">
            {value}
          </a>
        ) : (
          <p className="text-foreground/60">{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialLink({
  href,
  icon,
}: {
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-12 h-12 bg-primary text-white flex items-center justify-center hover:bg-primary/80 transition-colors"
      aria-label="Social link"
    >
      {icon}
    </a>
  );
}