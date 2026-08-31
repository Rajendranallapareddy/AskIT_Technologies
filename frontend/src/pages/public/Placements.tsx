import PlacementSection from '../../components/sections/Placement';
import Stats from '../../components/sections/Stats';
import Testimonials from '../../components/sections/Testimonials';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function Placements() {
  return (
    <>
      <Seo
        title="Placement Assistance"
        description="ASK IT Technologies stands with every student until they get placed — interview guidance, mock interviews, and hiring partner support included."
        path="/placements"
      />
      <PageHeader title="Placement Assistance" subtitle="We stand with you until you get placed." />
      <Stats />
      <PlacementSection />
      <Testimonials />
    </>
  );
}
