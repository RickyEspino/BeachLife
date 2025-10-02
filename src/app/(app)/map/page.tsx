import MapComponent from '@/components/Map';

export default function Page() {
  return (
    <section className="min-h-screen">
      <div className="h-[80vh] w-full">
        <MapComponent />
      </div>
    </section>
  );
}