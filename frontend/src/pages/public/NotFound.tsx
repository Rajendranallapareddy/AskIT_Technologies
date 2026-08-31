import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="py-32 text-center container-page">
      <p className="text-8xl font-extrabold text-navy-100">404</p>
      <h1 className="text-2xl font-bold text-navy-900 mt-4">Page Not Found</h1>
      <p className="text-navy-500 mt-2">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn-primary mt-8 inline-flex"><Home className="w-4 h-4" /> Back to Home</Link>
    </section>
  );
}
