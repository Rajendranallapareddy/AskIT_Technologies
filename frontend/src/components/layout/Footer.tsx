import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Linkedin, Twitter, Send } from 'lucide-react';
import { BRAND } from '../../utils/constants';

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-navy-200 pt-16 pb-8 mt-24">
      <div className="container-page grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <span className="text-2xl font-extrabold">
            <span className="text-white">ASK</span>
            <span className="text-orange-500">IT</span>
          </span>
          <p className="mt-4 text-sm leading-relaxed text-navy-300">
            Quality training at low prices, real-time project experience, interview guidance & 100% placement
            assistance until you get your dream job.
          </p>
          <div className="flex gap-3 mt-5">
            {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-orange-500 transition"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/about" className="hover:text-orange-400">About Us</Link></li>
            <li><Link to="/courses" className="hover:text-orange-400">Courses</Link></li>
            <li><Link to="/internships" className="hover:text-orange-400">Internships</Link></li>
            <li><Link to="/trainers" className="hover:text-orange-400">Trainers</Link></li>
            <li><Link to="/placements" className="hover:text-orange-400">Placements</Link></li>
            <li><Link to="/success-stories" className="hover:text-orange-400">Success Stories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/faq" className="hover:text-orange-400">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-orange-400">Contact Us</Link></li>
            <li><Link to="/privacy-policy" className="hover:text-orange-400">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-orange-400">Terms & Conditions</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">Get in Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" /> {BRAND.address}</li>
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-400 shrink-0" /> {BRAND.phones.join(' / ')}</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-orange-400 shrink-0" /> {BRAND.email}</li>
          </ul>
          <form className="mt-4 flex" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Subscribe to newsletter"
              className="flex-1 rounded-l-lg px-3 py-2 text-sm text-navy-900 focus:outline-none"
            />
            <button className="bg-orange-500 hover:bg-orange-600 px-3 rounded-r-lg flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="container-page mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-navy-400">
        <p>© {new Date().getFullYear()} ASK IT Technologies. All rights reserved.</p>
        <p>We don't just teach. We transform careers.</p>
      </div>
    </footer>
  );
}
