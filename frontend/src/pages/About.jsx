import { Link } from "react-router-dom";
import AnimatedTextCycle from "../components/AnimatedTextCycle";

export default function About() {
  return (
    <div className="ww-page-hero min-h-[calc(100vh-4.25rem)]">
    <main className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700 dark:border-violet-500/30 dark:text-violet-300">
        WheelWise PK
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        How we help you find a{" "}
        <span className="relative inline-flex text-violet-600 dark:text-violet-400">
          <AnimatedTextCycle
            words={["car you'll love", "perfect match", "great deal", "daily driver"]}
            interval={2800}
            className="text-3xl sm:text-4xl tracking-tight"
          />
        </span>
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-zinc-400">
        Buying a used car should feel exciting, not exhausting. WheelWise brings listings from trusted public marketplaces into one calm workspace — so you spend less time jumping between tabs and more time deciding what fits your life and budget.
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">What you get</h2>
          <ul className="mt-4 space-y-4 text-slate-600 dark:text-zinc-400">
            {[
              ["One place to explore.", "See fresh listings side by side instead of losing track in a dozen browser tabs."],
              ["Search the way you think.", "Describe the car in plain language — budget, city, fuel type, family size — and we translate that into focused searches across marketplaces."],
              ["A snapshot you can trust.", "We cache recent listings so pages load quickly and you can compare prices and details without every click hitting a live site."],
              ["Room to decide.", "Filter out noise and chat with an assistant that reads your saved inventory — follow-up questions feel natural."],
              ["Straight path to the seller.", "When you are ready, we send you to the original listing to arrange a call or visit — no mystery middlemen."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden="true"></span>
                <span><strong className="text-slate-800 dark:text-zinc-200">{title}</strong> {body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">How we surface strong matches</h2>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-zinc-400">
            You are not typing stiff filters into five different forms. You tell WheelWise what matters — like "reliable sedan under 3 million in Lahore" or "small automatic for city traffic" — and our AI turns that into targeted discovery across marketplaces. Fresh listings are prioritized so you are not chasing cars that have already been sitting for weeks.
          </p>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-zinc-400">
            From there, your results live in a workspace built for comparison: scan prices, mileage, and notes at a glance, then come back without starting from zero. The goal is not to pick a car for you — it is to narrow the noise so the best choices for <em>your</em> situation rise to the top faster.
          </p>
        </section>

        <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.07] p-6 dark:border-violet-400/20 dark:bg-violet-500/10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ready when you are</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
            Start with a single sentence about what you need — then refine and compare until something feels right. Advanced preferences live under Settings if you want to tune things later.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-violet-400 hover:to-violet-600">
              Start searching →
            </Link>
            <Link to="/settings" className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
              Settings
            </Link>
          </div>
        </section>
      </div>
    </main>
    </div>
  );
}
