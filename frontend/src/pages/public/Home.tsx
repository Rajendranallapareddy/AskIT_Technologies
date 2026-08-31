import Hero from '../../components/sections/Hero';
import Stats from '../../components/sections/Stats';
import About from '../../components/sections/About';
import WhyChooseUs from '../../components/sections/WhyChooseUs';
import Courses from '../../components/sections/Courses';
import Internships from '../../components/sections/Internships';
import Trainers from '../../components/sections/Trainers';
import Testimonials from '../../components/sections/Testimonials';
import Placement from '../../components/sections/Placement';
import Gallery from '../../components/sections/Gallery';
import FAQ from '../../components/sections/FAQ';
import Contact from '../../components/sections/Contact';
import Seo from '../../components/common/Seo';

export default function Home() {
  return (
    <>
      <Seo
        title="IT Training, Internships & Placement Assistance"
        description="ASK IT Technologies delivers quality IT training at low prices, with real-time project experience, interview guidance, and 100% placement assistance until you land your dream job."
        path="/"
        keywords={['IT training Hyderabad', 'software internships', 'placement assistance', 'cloud training', 'IT courses']}
      />
      <Hero />
      <Stats />
      <About />
      <WhyChooseUs />
      <Courses />
      <Internships />
      <Trainers />
      <Testimonials />
      <Placement />
      <Gallery />
      <FAQ />
      <Contact />
    </>
  );
}
