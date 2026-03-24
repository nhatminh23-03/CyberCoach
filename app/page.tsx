import { DetectionFrameworkSection } from "@/components/home/DetectionFrameworkSection";
import { EditorialInfoSection } from "@/components/home/EditorialInfoSection";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { HeroSection } from "@/components/home/HeroSection";

export default function HomePage() {
  return (
    <>
      <Header active="Home" />
      <main data-home-shell className="overflow-x-hidden snap-y snap-proximity">
        <HeroSection />
        <DetectionFrameworkSection />
        <EditorialInfoSection />
      </main>
      <Footer />
    </>
  );
}
