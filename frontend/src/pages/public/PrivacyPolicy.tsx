import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function PrivacyPolicy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="Read how ASK IT Technologies collects, uses, and protects your personal information across our website and training platform."
        path="/privacy-policy"
      />
      <PageHeader title="Privacy Policy" />
      <section className="py-16">
        <div className="container-page max-w-3xl prose prose-navy text-navy-600 space-y-4 text-sm leading-relaxed">
          <p>ASK IT Technologies ("we", "our", "us") respects your privacy. This policy explains how we collect, use, and protect your personal information when you use our website and services.</p>
          <h3 className="font-bold text-navy-900 text-lg">Information We Collect</h3>
          <p>We collect information you provide during registration (name, email, mobile number, educational details) and information generated through your use of our platform (attendance, registrations, certificates).</p>
          <h3 className="font-bold text-navy-900 text-lg">How We Use Your Information</h3>
          <p>Your information is used to manage your enrollment, track attendance and progress, issue certificates, and communicate important updates about your courses and internships.</p>
          <h3 className="font-bold text-navy-900 text-lg">Data Security</h3>
          <p>We use industry-standard security practices, including encrypted password storage and role-based access control, to protect your data from unauthorized access.</p>
          <h3 className="font-bold text-navy-900 text-lg">Contact Us</h3>
          <p>For any privacy-related questions, contact us at info@askittechnologies.com.</p>
        </div>
      </section>
    </>
  );
}
