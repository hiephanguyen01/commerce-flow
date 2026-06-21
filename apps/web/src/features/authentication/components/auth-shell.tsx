import type { ReactNode } from 'react';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="grid min-h-dvh lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950" />

          <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-slate-950 shadow-lg">
              CF
            </div>

            <div>
              <p className="text-lg font-semibold">CommerceFlow</p>

              <p className="text-sm text-slate-300">Professional commerce platform</p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-xl">
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-indigo-100">
              Built for modern commerce
            </p>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              Manage your commerce workflow from one place.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Secure authentication, inventory, orders, payments and event-driven workflows for a
              professional commerce platform.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              <FeatureMetric value="Secure" label="HttpOnly sessions" />

              <FeatureMetric value="Fast" label="Redis caching" />

              <FeatureMetric value="Scalable" label="Kafka events" />
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-400">© 2026 CommerceFlow</p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 font-bold text-white">
                CF
              </div>

              <div>
                <p className="font-semibold text-slate-950">CommerceFlow</p>

                <p className="text-xs text-slate-500">Professional commerce platform</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type FeatureMetricProps = {
  value: string;
  label: string;
};

function FeatureMetric({ value, label }: FeatureMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="font-semibold text-white">{value}</p>

      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
