import { Link } from 'react-router-dom';
import { Briefcase, Mail, Phone, MapPin, Github, Linkedin, Twitter, Heart, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-2 rounded-xl">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                JobPortal
              </span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-sm">
              Connecting talented professionals with amazing opportunities. 
              Find your dream job or hire the perfect candidate today.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: Twitter, href: '#', label: 'Twitter' },
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
                { icon: Github, href: '#', label: 'GitHub' },
              ].map((social, i) => (
                <a 
                  key={i}
                  href={social.href} 
                  className="p-2.5 bg-gray-800 hover:bg-primary-600 rounded-xl transition-all duration-200 hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* For Candidates */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">For Candidates</h3>
            <ul className="space-y-3">
              {[
                { to: '/jobs', label: 'Browse Jobs' },
                { to: '/register/candidate', label: 'Create Account' },
                { to: '/candidate/dashboard', label: 'Dashboard' },
                { to: '/candidate/applications', label: 'My Applications' },
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-gray-400 hover:text-primary-400 text-sm flex items-center group transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Employers */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">For Employers</h3>
            <ul className="space-y-3">
              {[
                { to: '/register/employer', label: 'Post a Job' },
                { to: '/employer/dashboard', label: 'Dashboard' },
                { to: '/employer/jobs', label: 'Manage Jobs' },
                { to: '/employer/profile', label: 'Company Profile' },
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-gray-400 hover:text-primary-400 text-sm flex items-center group transition-colors"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Contact Us</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@jobportal.com" className="flex items-center text-gray-400 hover:text-primary-400 text-sm transition-colors">
                  <div className="p-2 bg-gray-800 rounded-lg mr-3">
                    <Mail className="h-4 w-4" />
                  </div>
                  support@jobportal.com
                </a>
              </li>
              <li>
                <a href="tel:+15551234567" className="flex items-center text-gray-400 hover:text-primary-400 text-sm transition-colors">
                  <div className="p-2 bg-gray-800 rounded-lg mr-3">
                    <Phone className="h-4 w-4" />
                  </div>
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-center text-gray-400 text-sm">
                <div className="p-2 bg-gray-800 rounded-lg mr-3">
                  <MapPin className="h-4 w-4" />
                </div>
                123 Business Ave, Suite 100
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 p-6 bg-gradient-to-r from-primary-900/50 to-purple-900/50 rounded-2xl border border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-lg">Stay Updated</h4>
              <p className="text-gray-400 text-sm">Get the latest jobs and career tips in your inbox.</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 md:w-64 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm flex items-center">
              © {new Date().getFullYear()} JobPortal. Made with 
              <Heart className="h-4 w-4 mx-1 text-red-500 fill-red-500" /> 
              for job seekers
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item, i) => (
                <a key={i} href="#" className="text-gray-500 hover:text-primary-400 text-sm transition-colors">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
