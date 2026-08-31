import ContactSection from '../../components/sections/Contact';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';
import { BRAND } from '../../utils/constants';

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact Us"
        description={`Get in touch with ASK IT Technologies. Email ${BRAND.email} or call us — we'd love to hear from you.`}
        path="/contact"
      />
      <PageHeader title="Contact Us" subtitle="We'd love to hear from you." />
      <ContactSection />
    </>
  );
}
