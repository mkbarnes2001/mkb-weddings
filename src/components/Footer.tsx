import { Instagram, Facebook, Mail, Phone, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from 'figma:asset/59cfbace7d9f63a450210fde4f6bf784db9c67f5.png';

export function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-[1440px] mx-auto px-6 md:px-20 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-16">
          {/* Brand */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-6">
              <img src={logo} alt="MKB Weddings" className="h-12 w-auto brightness-0 invert" />
              <h3 className="text-white">
                <span className="logo-mkb">MKB</span> <span className="logo-weddings">WEDDINGS</span>
              </h3>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="mb-6 text-sm uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Stories & Reviews
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="md:col-span-3">
            <h4 className="mb-6 text-sm uppercase tracking-wide">Get in Touch</h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <a href="mailto:mark@mkbweddings.com" className="hover:text-white transition-colors flex items-center gap-2">
                  <Mail size={16} />
                  mark@mkbweddings.com
                </a>
              </li>
              <li>
                <a href="tel:+447546456077" className="hover:text-white transition-colors flex items-center gap-2">
                  <Phone size={16} />
                  +(44) 7546 456077
                </a>
              </li>
            </ul>
          </div>
        </div>

<div className="mt-6 flex justify-center">
  <GoogleReviewsBadge />
</div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/60">
          <p>© {new Date().getFullYear()} MKB Weddings. All rights reserved.</p>
          <p className="flex items-center gap-2">
            Made with <Heart size={14} fill="currentColor" /> for couples in love
          </p>
        </div>
      </div>
    </footer>
  );
}
