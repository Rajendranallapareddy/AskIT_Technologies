import { useState } from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { publicApi } from '../../api/endpoints';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/helpers';
import { BRAND } from '../../utils/constants';
import Button from '../common/Button';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await publicApi.contact(form);
      toast.success("Message sent! We'll get back to you shortly.");
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-navy-50/60">
      <div className="container-page grid lg:grid-cols-2 gap-12">
        <div>
          <span className="section-label">Contact Us</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-4">Let's Build Your Future Together</h2>
          <p className="mt-3 text-navy-600">Have a question about our courses or internships? Reach out — we reply fast.</p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-700 text-white flex items-center justify-center"><Phone className="w-5 h-5" /></span>
              <div>
                <p className="text-xs text-navy-400">Call Us</p>
                <p className="font-semibold text-navy-800">{BRAND.phones.join(' / ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-700 text-white flex items-center justify-center"><Mail className="w-5 h-5" /></span>
              <div>
                <p className="text-xs text-navy-400">Email Us</p>
                <p className="font-semibold text-navy-800">{BRAND.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-700 text-white flex items-center justify-center"><MapPin className="w-5 h-5" /></span>
              <div>
                <p className="text-xs text-navy-400">Visit Us</p>
              </div>
            </div>
          </div>

         <div className="mt-8 rounded-2xl overflow-hidden border border-navy-100 h-56 bg-navy-100 flex items-center justify-center text-navy-400 text-sm">
            Map preview — Coming Soon
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="you@example.com" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" placeholder="Course inquiry" />
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input-field" placeholder="How can we help?" />
          </div>
          <Button type="submit" isLoading={isSubmitting} className="w-full" icon={<Send className="w-4 h-4" />}>
            Send Message
          </Button>
        </form>
      </div>
    </section>
  );
}
