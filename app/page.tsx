import { SmoothScroll } from "@/components/smooth-scroll"
import { LumentaNavbar } from "@/components/lumenta-navbar"
import { LumentaHero } from "@/components/lumenta-hero"
import { LumentaHowItWorks } from "@/components/lumenta-how-it-works"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-zinc-950">
        <LumentaNavbar />
        <LumentaHero />
        <LumentaHowItWorks />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
