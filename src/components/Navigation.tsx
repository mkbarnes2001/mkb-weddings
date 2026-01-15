import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from 'figma:asset/59cfbace7d9f63a450210fde4f6bf784db9c67f5.png';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/gallery', label: 'Gallery' },
    { path: '/packages', label: 'Packages' },
    { path: '/blog', label: 'Stories & Reviews' },
    { path: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/gallery') {
      return location.pathname.startsWith('/gallery');
    }
    return location.pathname === path;
  };

  const isHomePage = location.pathname === '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHomePage && !scrolled 
        ? 'bg-transparent border-transparent' 
        : 'bg-white/95 backdrop-blur-sm border-b border-border'
    }`}>
      <div className="max-w-[1440px] mx-auto px-6 md:px-20">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img 
              src={logo} 
              alt="MKB Weddings" 
              className={`h-12 w-auto transition-all duration-300 ${
                isHomePage && !scrolled 
                  ? 'brightness-0 invert' 
                  : 'logo-grey'
              }`} 
            />
            <span className="text-xl group-hover:opacity-80 transition-all duration-300">
              <span 
                className="logo-mkb"
                style={isHomePage && !scrolled ? { color: 'white' } : undefined}
              >
                MKB
              </span>{' '}
              <span 
                className="logo-weddings"
                style={isHomePage && !scrolled ? { color: 'white' } : undefined}
              >
                WEDDINGS
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`relative transition-colors text-sm uppercase ${
                  path === '/contact'
                    ? isHomePage && !scrolled
                      ? 'font-bold text-foreground hover:text-primary bg-white px-1.5 py-0 rounded'
                      : 'font-bold text-foreground hover:text-primary'
                    : isHomePage && !scrolled
                    ? isActive(path) ? 'text-white' : 'text-white/70 hover:text-white'
                    : isActive(path) ? 'text-primary' : 'text-foreground/60 hover:text-primary'
                }`}
                style={{ letterSpacing: '0.01em' }}
              >
                {label}
                {isActive(path) && path !== '/contact' && (
                  <span className={`absolute -bottom-1 left-0 right-0 h-px ${
                    isHomePage && !scrolled ? 'bg-white' : 'bg-primary'
                  }`} />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 ${
              isHomePage && !scrolled ? 'text-white' : 'text-primary'
            }`}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-border">
          <div className="px-6 py-4 space-y-4">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block w-full text-left py-2 text-sm tracking-wide uppercase ${
                  isActive(path) ? 'text-primary' : 'text-foreground/60'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}