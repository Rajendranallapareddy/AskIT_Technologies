import TrainersSection from '../../components/sections/Trainers';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function TrainersPage() {
  return (
    <>
      <Seo
        title="Meet Our Trainers"
        description="Learn from ASK IT Technologies trainers — professionals actively working in the industry, teaching real-time, project-based IT skills."
        path="/trainers"
      />
      <PageHeader title="Meet Our Trainers" subtitle="Learn from professionals actively working in the industry." />
      <TrainersSection />
    </>
  );
}
