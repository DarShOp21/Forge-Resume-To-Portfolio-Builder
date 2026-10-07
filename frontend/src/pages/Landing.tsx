import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { FeatureCards } from "../components/FeatureCards";
import { UploadDemo } from "../components/UploadDemo";
import { Testimonials } from "../components/Testimonials";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { Footer } from "../components/Footer";

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <FeatureCards />
        <UploadDemo />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
