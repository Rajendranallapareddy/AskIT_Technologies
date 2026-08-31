import AboutSection from '../../components/sections/About';
import WhyChooseUs from '../../components/sections/WhyChooseUs';
import Stats from '../../components/sections/Stats';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function About() {
  return (
    <>
      <Seo
        title="About Us"
        description="ASK IT Technologies is an IT training and internship provider in Hyderabad, Telangana, focused on real-time project experience, interview guidance, and placement support — Learn Today, Grow Tomorrow, Succeed Always."
        path="/about"
      />
      <PageHeader title="About ASK IT Technologies" subtitle="Learn Today. Grow Tomorrow. Succeed Always." />
      <AboutSection />
      <Stats />
      <WhyChooseUs />
    </>
  );
}
