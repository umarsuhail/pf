
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
  width: string;
  tone: "light" | "dark";
  image?: string;
  projects?: {
    title: string;
    description: string;
    // Optional on purpose. A project without artwork yet draws its own panel
    // (see ProjectStackShowcase) rather than pointing at a file that is not
    // there — four of these were paths to deleted or never-added images, and
    // each one rendered as an empty box plus a 404 on every page load.
    image?: string;
    imageFit?: "contain";
    category: string;
    stack: string[];
    href?: string;
  }[];
  timeline?: {
    company: string;
    role: string;
    period: string;
    location: string;
    summary: string;
  }[];
};

export const cards: FlightCard[] = [
  {
    id: "home",
    eyebrow: "01 / Hello",
    title: "",
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
    width: "clamp(420px, 58vw, 900px)",
    tone: "light",
  },
  {
    id: "skills",
    eyebrow: "02 / Skills",
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
      "Zustand — Expert",
      "Material-UI — Expert",
      "Figma — Expert",
      "Adobe Photoshop — Expert",
      "Adobe Illustrator — Expert",
      "Adobe Premiere Pro — Intermediate",
      "Adobe After Effects — Intermediate",
      "Node.js — Intermediate",
      "MongoDB — Intermediate",
      "Git — Intermediate",
      "Docker — Intermediate",
    ],
    cta: "Skill Details",
    align: "left",
    x: -250,
    width: "clamp(400px, 54vw, 840px)",
    tone: "light",
  },
  {
    id: "projects",
    eyebrow: "03 / Projects",
    title: "Enterprise Products, Intelligent Platforms & Digital Experiences",
    description:
      "A selection of products I’ve designed and built across enterprise dashboards, biometric and identity platforms, AI-powered applications, workflow systems, and developer-focused tools — combining scalable frontend architecture with thoughtful, high-performance user experiences..",
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
    width: "clamp(420px, 60vw, 950px)",
    tone: "dark",
    projects: [
      {
        title: "Enterprise Dashboard — Transaction & Revenue Monitoring",
        description:
          "A multi-tenant analytics dashboard for real-time transaction monitoring, revenue tracking, and advanced reporting.",
        category: "Dashboards",
        stack: ["Next.js", "React", "TypeScript", "Node.js"],
      },
      {
        title: "Telecom Transaction Monitoring Dashboard",
        description:
          "A real-time dashboard for monitoring telecom transactions — live volumes, sales and revenue trends, and at-a-glance operational KPIs.",
        image: "/sales-dashboard.png",
        category: "Dashboards",
        stack: ["React", "TypeScript", "Data Visualization"],
      },
      {
        // TODO(umar): the copy here is a placeholder — the artwork is yours
        // but nothing in the repo describes this project. Replace the
        // description, category and stack with the real ones before shipping.
        title: "Flight Booking Platform",
        description: "PLACEHOLDER — describe this project.",
        image: "/space/flightbooking.png",
        category: "Platforms",
        stack: [],
      },
      {
        title: "Biometric Identity & Recognition Platform",
        description:
          "AI-powered face recognition system with real-time biometric monitoring, computer vision integrations, and modern UI/UX.",
        category: "AI/ML",
        stack: ["Next.js", "React", "TypeScript", "Computer Vision"],
      },
      {
        title: "AI-Powered Visual Assistant",
        description:
          "A real-time monitoring dashboard for automated accident assessment, pairing computer vision with visual reporting.",
        category: "AI/ML",
        stack: ["React.js", "JavaScript", "HTML/CSS", "Bootstrap"],
      },
      {
        title: "Tenant & Configuration Management Platform",
        description:
          "A dynamic platform for tenant onboarding, configuration workflows, and role-based access management.",
        image: "/3.png",
        imageFit: "contain",
        category: "Enterprise",
        stack: ["Next.js", "TypeScript", "Node.js"],
      },
      {
        title: "AI Chatbot & Monitoring Systems",
        description:
          "AI-powered chatbot interfaces paired with a real-time monitoring dashboard for operational reporting.",
        image: "/2.png",
        imageFit: "contain",
        category: "Productivity",
        stack: ["React.js", "JavaScript", "Socket.io"],
      },
      {
        title: "Resume & Career Tools",
        description:
          "ATS-friendly resume builder with live editing, styling, preview, and PDF/TeX export.",
        category: "Tools",
        stack: ["Next.js", "TypeScript", "Tailwind CSS", "LaTeX"],
        href: process.env.NEXT_PUBLIC_ATS_STUDIO_URL ?? "http://localhost:3010",
      },
    ],
  },
  {
    id: "experience",
    eyebrow: "04 / Experience",
    title: "Professional Experience Across UAE and India",
    description:
      "A track record of delivering impactful frontend solutions across biometric systems, MLM platforms, enterprise web apps, and reusable UI component libraries.",
    details: [
      "Emirates Face Recognition, Application Developer, Nov 2024 - Present, Abu Dhabi: AI-powered face recognition systems and enterprise dashboards",
      "EFR: scalable React and Next.js applications, real-time biometric monitoring, modern UI/UX, computer vision integrations",
      "Epixel Solutions, Development Team Lead, Nov 2022 - May 2024, Kochi: led MLM software and enterprise frontend delivery",
      "Epixel: improved code quality by 40%, mentored developers, set coding standards, delivered React and Next.js solutions",
      "Aspire Systems, Software Engineer, Nov 2020 - Oct 2022, Kochi: React apps, Redux workflows, REST API integrations, client delivery",
      "Uvionics Tech India Pvt Ltd, UI Developer, Aug 2018 - Nov 2020, Koratty: HTML, CSS, JavaScript, Bootstrap, React, reusable components",
    ],
    cta: "View Timeline",
    align: "left",
    x: -290,
    width: "clamp(390px, 52vw, 800px)",
    tone: "dark",
    timeline: [
      {
        company: "Emirates Face Recognition",
        role: "Application Developer",
        period: "Nov 2024 – Present",
        location: "Abu Dhabi",
        summary:
          "AI-powered face recognition systems and enterprise dashboards. Scalable React and Next.js applications, real-time biometric monitoring, modern UI/UX, computer vision integrations.",
      },
      {
        company: "Epixel Solutions",
        role: "Development Team Lead",
        period: "Nov 2022 – May 2024",
        location: "Kochi",
        summary:
          "Led MLM software and enterprise frontend delivery. Improved code quality by 40%, mentored developers, set coding standards, delivered React and Next.js solutions.",
      },
      {
        company: "Aspire Systems",
        role: "Software Engineer",
        period: "Nov 2020 – Oct 2022",
        location: "Kochi",
        summary: "React apps, Redux workflows, REST API integrations, client delivery.",
      },
      {
        company: "Uvionics Tech India Pvt Ltd",
        role: "UI Developer",
        period: "Aug 2018 – Nov 2020",
        location: "Koratty",
        summary: "HTML, CSS, JavaScript, Bootstrap, React, reusable components.",
      },
    ],
  },
  {
    id: "contact",
    eyebrow: "05 / Contact",
    title: "Ready to Build Something Amazing?",
    description:
      "Have a project in mind or just want to talk frontend? I'm based in Abu Dhabi, open to new opportunities, and always happy to connect.",
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
    width: "clamp(420px, 58vw, 940px)",
    tone: "dark",
  },
];

export const sectionProgressMap: Record<string, number> = {
  home: 0,
  skills: 0.17,
  projects: 0.68,
  experience: 0.8,
  contact: 0.92,
};

export const cardGradients = [
  "var(--flight-card-home)",
  "var(--flight-card-skills)",
  "var(--flight-card-projects)",
  "var(--flight-card-experience)",
  "var(--flight-card-contact)",
  "var(--flight-card-projects)",
  "var(--flight-card-experience)",
];
