import PageHeader from './_PageHeader';
import Seo from '../../components/common/Seo';

export default function Terms() {
  return (
    <>
      <Seo
        title="Terms & Conditions"
        description="Terms and conditions for enrolling in courses and internships with ASK IT Technologies — covering enrollment, attendance, certification, and cancellations."
        path="/terms"
      />
      <PageHeader title="Terms & Conditions" />
      <section className="py-16">
        <div className="container-page max-w-3xl prose prose-navy text-navy-600 space-y-4 text-sm leading-relaxed">
          <p>By registering for a course or internship with ASK IT Technologies, you agree to the following terms.</p>
          <h3 className="font-bold text-navy-900 text-lg">Enrollment</h3>
          <p>Enrollment is confirmed only after registration approval and, where applicable, payment of course fees. Seats are allocated on a first-come, first-served basis.</p>
          <h3 className="font-bold text-navy-900 text-lg">Attendance & Certification</h3>
          <p>Certificates are issued only to students who meet the minimum attendance and project completion requirements for their internship or course.</p>
          <h3 className="font-bold text-navy-900 text-lg">Cancellations</h3>
          <p>Registrations may be cancelled before the registration deadline. Refund policies, where applicable, will be communicated at the time of enrollment.</p>
          <h3 className="font-bold text-navy-900 text-lg">Code of Conduct</h3>
          <p>Students are expected to maintain professional conduct during training sessions and internships. Violation may result in removal from the program without refund.</p>
        </div>
      </section>
    </>
  );
}
