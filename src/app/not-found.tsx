import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="num text-6xl font-semibold text-fg/90">404</p>
        <p className="mt-3 text-sm text-muted">A página que você procura não existe.</p>
        <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-lg bg-fg px-4 text-sm font-medium text-bg">
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
