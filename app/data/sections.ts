// Shared section content for both the scroll-driven flight on `/` and the
// standalone detail page each section gets at `/[section]`. Kept in one place
// so the two views can never drift apart.

import { NARRATION_SCRIPT } from "./narration";

export type FlightCard = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  details: string[];
  cta: string;
  align: "left" | "right";
  x: number;
  z: number;
  width: string;
  tone: "light" | "dark";
  // Optional hero art for the standalone /[section] detail page
  image?: string;
};

export const cards: FlightCard[] = [
  {
    id: "home",
    eyebrow: "01 / Hello",
    title: "Hi, I'm Umar Suhail",
    description: NARRATION_SCRIPT,
    details: [
      "Next.js developer and frontend developer based in Abu Dhabi",
      "Originally from Thrissur, Kerala",
      "Specialises in UI/UX design and frontend architecture",
      "Also searched as Umer Suhail, Omer Suhail, and Umar Sohail",
      "Stats: 7+ years experience, 6+ projects delivered, 1M+ transactions monitored, 50+ tenant configurations",
    ],
    cta: "Profile Details",
    align: "left",
    x: -80,
    z: 0,
    width: "clamp(420px, 58vw, 900px)",
    tone: "light",
  },
  {
    id: "about",
    eyebrow: "02 / About Me",
    title: "Software Developer from Kerala, set in Abu Dhabi",
    description:
      "My path spans UI Developer at Uvionics Tech, Software Engineer at Aspire Systems, Development Team Lead at Epixel Solutions, and Application Developer at EFR.",
    details: [
      "Full name: Umar Suhail",
      "Role: Lead Frontend Engineer",
      "Nationality: Indian",
      "Languages: English, Hindi, Urdu, Malayalam, Tamil",
      "Education: KMP College of Engineering",
      "Current location: Abu Dhabi, United Arab Emirates",
      "Hometown: Thrissur, Kerala",
      "Open to remote and relocation opportunities",
    ],
    cta: "About Details",
    align: "right",
    x: 280,
    z: -950,
    width: "clamp(400px, 54vw, 840px)",
    tone: "light",
  },
  {
    id: "skills",
    eyebrow: "03 / Skills",
    title: "React, Next.js, TypeScript, UI/UX, and Performance",
    description:
      "I specialise in high-performance frontend architecture with React, Next.js, TypeScript, Redux Toolkit, and Tailwind CSS, design interfaces end-to-end in Figma and Adobe Creative Suite, and round it out with Node.js and MongoDB on the backend.",
    details: [
      "React JS — Expert",
      "Next.js — Expert",
      "TypeScript — Expert",
      "JavaScript — Expert",
      "HTML5 — Expert",
      "CSS3 — Expert",
      "Tailwind CSS — Expert",
      "Redux — Expert",
      "Material-UI — Expert",
      "Figma — Expert",
      "Adobe Photoshop — Expert",
      "Adobe Illustrator — Expert",
      "Adobe Premiere Pro — Intermediate",
      "Adobe After Effects — Intermediate",
      "Node.js — Intermediate",
      "MongoDB — Intermediate",
      "Git — Intermediate",
      "Jenkins — Intermediate",
      "Docker — Intermediate",
    ],
    cta: "Skill Details",
    align: "left",
    x: -250,
    z: -1850,
    width: "clamp(400px, 54vw, 840px)",
    tone: "light",
  },
  {
    id: "projects",
    eyebrow: "04 / Projects",
    title: "Enterprise Dashboards, Biometric Platforms, and Interactive Experiences",
    description:
      "Recent work includes AI-powered face-recognition systems, biometric transaction monitoring dashboards, tenant configuration workflows, and MLM software.",
    details: [
      "Dashboard v2 — Transaction & Revenue Monitoring: migrated a legacy Angular multi-tenant dashboard to Next.js + TypeScript, with role/permission access, KYC workflows, and billing analytics (Next.js, React, TypeScript, Node.js, Docker)",
      "AI Chatbots: AI-powered chatbot interfaces and a real-time monitoring dashboard for accident assessment and reporting (React.js, JavaScript, HTML, CSS, Bootstrap)",
      "Loyalty Platform: a high-performance Next.js app built to boost customer engagement and retention (Next.js, TypeScript, Tailwind CSS)",
      "Get-Life: dynamic UI components and pages for GetLife Insurance UK (Gatsby.js, TypeScript, Tailwind CSS)",
      "Confidential: UI components and pages for a leading U.S.-based insurance company (React.js, Node.js, Redux-saga, Bootstrap)",
      "Portfolio: interactive scroll-driven 3D portfolio experience",
    ],
    cta: "Project Details",
    align: "right",
    x: 260,
    z: -4700,
    width: "clamp(420px, 60vw, 950px)",
    tone: "dark",
  },
  {
    id: "experience",
    eyebrow: "05 / Experience",
    title: "Professional Experience Across UAE and India",
    description:
      "A track record of delivering impactful frontend solutions across biometric systems, MLM platforms, enterprise web apps, and reusable UI component libraries.",
    details: [
      "Emirates Face Recognition, Application Developer, Feb 2025 - Present, Abu Dhabi: AI-powered face recognition systems and enterprise dashboards",
      "EFR: scalable React and Next.js applications, real-time biometric monitoring, modern UI/UX, computer vision integrations",
      "Epixel Solutions, Development Team Lead, Nov 2022 - May 2024, Kochi: led MLM software and enterprise frontend delivery",
      "Epixel: improved code quality by 40%, mentored developers, set coding standards, delivered React and Next.js solutions",
      "Aspire Systems, Software Engineer, Nov 2020 - Oct 2022, Kochi: React apps, Redux workflows, REST API integrations, client delivery",
      "Uvionics Tech India Pvt Ltd, UI Developer, Aug 2018 - Nov 2020, Koratty: HTML, CSS, JavaScript, Bootstrap, React, reusable components",
    ],
    cta: "View Timeline",
    align: "left",
    x: -290,
    z: -5750,
    width: "clamp(390px, 52vw, 800px)",
    tone: "dark",
  },
  {
    id: "contact",
    eyebrow: "06 / Contact",
    title: "Ready to Build Something Amazing?",
    description:
      "I'm always excited to work on new projects and collaborate with innovative teams. Reach me in Abu Dhabi, UAE, or connect online.",
    details: [
      "Email: umarsuhail112@gmail.com",
      "Phone: +971 551 912 074 / +971 568 323 258 / +91 949 765 6243",
      "LinkedIn: linkedin.com/in/umar-suhail",
      "GitHub: github.com/umarsuhail",
      "Instagram: instagram.com/umarsuhail__",
      "Values: innovation, collaboration, excellence, learning",
      "Interests: cricket, music, photography",
    ],
    cta: "Get In Touch",
    align: "left",
    x: -220,
    z: -7728,
    width: "clamp(420px, 58vw, 940px)",
    tone: "dark",
  },
];

export const sectionProgressMap: Record<string, number> = {
  home: 0,
  about: 0.11,
  skills: 0.22,
  projects: 0.56,
  experience: 0.69,
  contact: 0.92,
};

export const cardGradients = [
  "radial-gradient(120% 120% at 15% 20%, rgba(0,108,159,0.85) 0%, rgba(0,108,159,0.25) 55%, rgba(0,108,159,0) 100%), linear-gradient(135deg, #00273f 0%, #003f5f 50%, #006c9f 100%)",
  "linear-gradient(160deg, #111827 0%, #1e3a5f 55%, #00294a 100%)",
  "linear-gradient(120deg, #0f172a 0%, #25397c 52%, #1d4ed8 115%)",
  "linear-gradient(150deg, #1f2937 0%, #0e3a5c 42%, #540615 96%)",
  "linear-gradient(125deg, #0b1120 0%, #155e75 58%, #10427a 100%)",
  "linear-gradient(165deg, #1e293b 0%, #50260b 46%, #1e40af 112%)",
  "linear-gradient(140deg, #111827 8%, #0f3d5c 50%, #41272a 108%)",
];
