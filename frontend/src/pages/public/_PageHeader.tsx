export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-br from-navy-900 to-navy-700 text-white py-16">
      <div className="container-page text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-3 text-navy-200 max-w-xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  );
}
