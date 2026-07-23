import {
  ActivityRail,
  FeaturesSection,
  IntegrationsStrip,
} from "@/components/landing/landing-features";
import { LandingBackground } from "@/components/landing/landing-background";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  LandingCta,
  WorkflowSection,
} from "@/components/landing/landing-workflow";

export function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0b0b0b] text-[#f6f4ef]">
      <LandingBackground />
      <LandingHeader />

      <div className="relative z-10 mx-auto max-w-6xl overflow-hidden border-x border-white/8">
        <LandingHero />
        <IntegrationsStrip />
        <FeaturesSection />
        <ActivityRail />
        <WorkflowSection />
        <LandingCta />
      </div>

      <LandingFooter />
    </main>
  );
}
