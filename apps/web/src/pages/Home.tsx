import { Link } from "react-router-dom";
import { CATEGORIES } from "@bantay/shared";
import { ArrowRight, MapPin, CheckCircle2, Search } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { categoryIcon } from "@/components/category";

export function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-600 to-brand-700 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-100">
            City Government of Biñan
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
            See it. Report it. Fix it.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-brand-50">
            Report potholes, flooding, broken streetlights, and other community issues directly to
            the right city office — and track the fix from start to finish.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/report">
              <Button size="lg" variant="secondary" className="bg-white text-brand-700 hover:bg-brand-50">
                Report an issue <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/track">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <Search className="h-5 w-5" /> Track a report
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, title: "1. Pin the location", text: "Snap a photo and drop a pin where the problem is." },
            { icon: ArrowRight, title: "2. We route it", text: "Your report goes straight to the responsible city office." },
            { icon: CheckCircle2, title: "3. Track the fix", text: "Follow progress and see proof when it's resolved." },
          ].map((s) => (
            <Card key={s.title}>
              <CardBody>
                <s.icon className="h-8 w-8 text-brand-600" />
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-4 text-lg font-semibold">What can you report?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = categoryIcon(c.slug);
            return (
              <Link key={c.slug} to={`/report?category=${c.slug}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardBody className="flex flex-col items-center gap-2 p-4 text-center">
                    <Icon className="h-7 w-7 text-brand-600" />
                    <span className="text-sm font-medium">{c.label}</span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
