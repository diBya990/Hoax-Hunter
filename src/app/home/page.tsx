import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import Hud from "@/components/Hud";
import { safeNext } from "@/lib/safeNext";
import { getCurrentUser } from "@/lib/supabase/server";

type Card = {
  href: string;
  title: string;
  text: string;
  accent: string;
  tilt: string;
  icon: React.ReactNode;
};

const svgProps = {
  width: "100%",
  height: "100%",
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  stroke: "currentColor",
};

const cards: Card[] = [
  {
    href: "/play",
    title: "Play",
    text: "Four game modes. Spot the scam, survive the chat, beat the bosses.",
    accent: "#22e4ff",
    tilt: "7deg",
    icon: (
      <svg {...svgProps}>
        <polygon points="7 4 20 12 7 20" fill="currentColor" fillOpacity="0.25" />
      </svg>
    ),
  },
  {
    href: "/helper",
    title: "Scam Helper",
    text: "Paste a message, link or screenshot. Get a risk score and what to do next.",
    accent: "#3dffa2",
    tilt: "-7deg",
    icon: (
      <svg {...svgProps}>
        <path
          d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
          fill="currentColor"
          fillOpacity="0.2"
        />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </svg>
    ),
  },
  {
    href: "/dex",
    title: "Scam Dex",
    text: "Every scam you have met, and the tricks you keep falling for.",
    accent: "#ffc83d",
    tilt: "7deg",
    icon: (
      <svg {...svgProps}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.2" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  {
    href: "/profile",
    title: "Profile",
    text: "Your level, XP, wallet and streak.",
    accent: "#ff3d6e",
    tilt: "-7deg",
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.2" />
        <path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
];

// The hub. Nobody gets in without logging in: a visitor who is not logged in
// only sees the login / sign-up popup (it cannot be closed).
export default async function Home(props: PageProps<"/home">) {
  const user = await getCurrentUser();
  if (!user) {
    const { next } = await props.searchParams;
    return <AuthModal next={safeNext(next)} />;
  }

  return (
    <div className="flex h-full flex-col">
      <section className="shrink-0 pt-2 text-center">
        <p className="font-mono text-[10px] tracking-[0.4em] text-muted sm:text-xs">
          MISSION CONTROL
        </p>
        <h1 className="title-gradient hover-title mt-1 text-3xl font-black sm:text-5xl">
          Choose your path
        </h1>
        <Hud />
      </section>

      <section className="scene mx-auto grid min-h-0 w-full max-w-2xl flex-1 grid-cols-2 content-center gap-5 px-2 sm:gap-7">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card3d flex items-center gap-3 p-3 sm:gap-4 sm:p-4"
            style={
              {
                "--accent": c.accent,
                "--ry": c.tilt,
              } as React.CSSProperties
            }
          >
            <div
              className="card3d-icon h-9 w-9 shrink-0 sm:h-11 sm:w-11"
              style={{ color: c.accent }}
            >
              {c.icon}
            </div>
            <div className="card3d-body">
              <h2
                className="text-base font-extrabold sm:text-xl"
                style={{ color: c.accent }}
              >
                {c.title}
              </h2>
              <p className="mt-0.5 hidden text-xs text-muted sm:block">{c.text}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
