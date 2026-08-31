import GallerySection from '../../components/sections/Gallery';
import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function GalleryPage() {
  return (
    <>
      <Seo
        title="Gallery"
        description="A glimpse into life at ASK IT Technologies — training sessions, events, and student moments."
        path="/gallery"
      />
      <PageHeader title="Gallery" subtitle="A glimpse into life at ASK IT Technologies." />
      <GallerySection />
    </>
  );
}
