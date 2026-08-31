import FAQSection from '../../components/sections/FAQ';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function FAQPage() {
  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Everything you need to know before you enroll at ASK IT Technologies — courses, internships, fees, and placement assistance."
        path="/faq"
      />
      <PageHeader title="Frequently Asked Questions" subtitle="Everything you need to know before you enroll." />
      <FAQSection />
    </>
  );
}
