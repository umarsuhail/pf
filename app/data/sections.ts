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
<<<<<<< HEAD
  // Structured content backing the bespoke /[section] layouts below —
  // only set on the cards that actually use them (projects, experience).
  projects?: {
    title: string;
    description: string;
    image: string;
    category: string;
    stack: string[];
  }[];
  timeline?: {
    company: string;
    role: string;
    period: string;
    location: string;
    summary: string;
  }[];
=======
>>>>>>> 8a13a2e (ccc)
};

export const cards: FlightCard[] = [
  {
    id: "home",
    eyebrow: "01 / Hello",
<<<<<<< HEAD
    // The bio below opens with "Hi, I'm Umar Suhail" verbatim (see
    // NARRATION_SCRIPT) — this title sits right above it now that the intro
    // card stacks portrait-then-bio, so it can't repeat that line.
    title: "Welcome to My Portfolio",
=======
    title: "Hi, I'm Umar Suhail",
>>>>>>> 8a13a2e (ccc)
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
<<<<<<< HEAD
    // Wider than the rest — the intro stacks its portrait on top of the bio
    // rather than sitting beside it, so it reads better as a broad banner.
    width: "clamp(480px, 74vw, 1040px)",
=======
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
>>>>>>> 8a13a2e (ccc)
    tone: "light",
  },
  {
    id: "skills",
<<<<<<< HEAD
    eyebrow: "02 / Skills",
    title: "React, Next.js, TypeScript, UI/UX, and Performance",
    description:
      "I specialise in high-performance frontend architecture with React, Next.js, TypeScript, Redux Toolkit, and Tailwind CSS, design interfaces end-to-end in Figma and Adobe Creative Suite, and round it out with Node.js and MongoDB on the backend.",
=======
    eyebrow: "03 / Skills",
    title: "React, Next.js, TypeScript, UI/UX, and Performance",
    description:
      "I specialise in high-performance frontend architecture with React, Next.js, TypeScript, Redux Toolkit, Tailwind CSS, Figma, and Adobe Creative Suite.",
>>>>>>> 8a13a2e (ccc)
    details: [
      "React JS — Expert",
      "Next.js — Expert",
      "TypeScript — Expert",
      "JavaScript — Expert",
<<<<<<< HEAD
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
      "Jenkins — Intermediate",
      "Docker — Intermediate",
=======
      "HTML5 / CSS3 — Expert",
      "Tailwind CSS — Expert",
      "Redux — Expert",
      "Material-UI — Expert",
      "Node.js — Intermediate",
      "Git — Intermediate",
      "Jenkins — Intermediate",
>>>>>>> 8a13a2e (ccc)
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
<<<<<<< HEAD
    eyebrow: "03 / Projects",
    title: "Enterprise Products, Intelligent Platforms & Digital Experiences",
    description:
      "A selection of products I’ve designed and built across enterprise dashboards, biometric and identity platforms, AI-powered applications, workflow systems, and developer-focused tools — combining scalable frontend architecture with thoughtful, high-performance user experiences..",
=======
    eyebrow: "04 / Projects",
    title: "Enterprise Dashboards, Biometric Platforms, and Resume Tools",
    description:
      "Recent work includes AI-powered face-recognition systems, biometric transaction monitoring dashboards, tenant configuration workflows, MLM software, and a free resume builder.",
>>>>>>> 8a13a2e (ccc)
    details: [
      "Dashboard v2 — Transaction & Revenue Monitoring: migrated a legacy Angular multi-tenant dashboard to Next.js + TypeScript, with role/permission access, KYC workflows, and billing analytics (Next.js, React, TypeScript, Node.js, Docker)",
      "AI Chatbots: AI-powered chatbot interfaces and a real-time monitoring dashboard for accident assessment and reporting (React.js, JavaScript, HTML, CSS, Bootstrap)",
      "Loyalty Platform: a high-performance Next.js app built to boost customer engagement and retention (Next.js, TypeScript, Tailwind CSS)",
      "Get-Life: dynamic UI components and pages for GetLife Insurance UK (Gatsby.js, TypeScript, Tailwind CSS)",
      "Confidential: UI components and pages for a leading U.S.-based insurance company (React.js, Node.js, Redux-saga, Bootstrap)",
<<<<<<< HEAD
=======
      "Resume Builder: ATS-friendly templates with editing, styling, preview, and PDF export",
>>>>>>> 8a13a2e (ccc)
      "Portfolio: interactive scroll-driven 3D portfolio experience",
    ],
    cta: "Project Details",
    align: "right",
    x: 260,
    z: -4700,
    width: "clamp(420px, 60vw, 950px)",
    tone: "dark",
<<<<<<< HEAD
    projects: [
      {
        title: "Enterprise Dashboard — Transaction & Revenue Monitoring",
        description:
          "A multi-tenant analytics dashboard for real-time transaction monitoring, revenue tracking, and advanced reporting.",
        // TODO: swap for the real project screenshot
        image: "/images/pro1.png",
        category: "Dashboards",
        stack: ["Next.js", "React", "TypeScript", "Node.js"],
      },
      {
        title: "Biometric Identity & Recognition Platform",
        description:
          "AI-powered face recognition system with real-time biometric monitoring, computer vision integrations, and modern UI/UX.",
        image: "/images/pro1.png",
        category: "AI/ML",
        stack: ["Next.js", "React", "TypeScript", "Computer Vision"],
      },
      {
        title: "AI-Powered Visual Assistant",
        description:
          "A real-time monitoring dashboard for automated accident assessment, pairing computer vision with visual reporting.",
        image: "/images/pro1.png",
        category: "AI/ML",
        stack: ["React.js", "JavaScript", "HTML/CSS", "Bootstrap"],
      },
      {
        title: "Multi-Tenant Transaction Monitoring Dashboard",
        description:
          "A dynamic platform for tenant listing, seperated with configurations workflows, and role-based access management.",
        image: "/images/pro1.png",
        category: "Enterprise",
        stack: ["Next.js", "TypeScript", "Node.js"],
      },
      {
        title: "AI Chatbot & Monitoring Systems",
        description:
          "AI-powered chatbot interfaces paired with a real-time monitoring dashboard for operational reporting.",
        image: "/images/pro1.png",
        category: "Productivity",
        stack: ["React.js", "JavaScript", "Socket.io"],
      },
      {
        title: "Resume & Career Tools",
        description:
          "ATS-friendly resume builder with live editing, styling, preview, and PDF/TeX export.",
        image: "/images/pro1.png",
        category: "Tools",
        stack: ["Next.js", "TypeScript", "Tailwind CSS", "PDFKit"],
      },
    ],
  },
  {
    id: "experience",
    eyebrow: "04 / Experience",
=======
  },
  {
    id: "experience",
    eyebrow: "05 / Experience",
>>>>>>> 8a13a2e (ccc)
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
<<<<<<< HEAD
    timeline: [
      {
        company: "Emirates Face Recognition",
        role: "Application Developer",
        period: "Feb 2025 – Present",
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
    eyebrow: "06 / Contact",
    title: "Ready to Build Something Amazing?",
    description:
      "Have a project in mind or just want to talk frontend? I'm based in Abu Dhabi, open to new opportunities, and always happy to connect.",
=======
  },
  {
    id: "resume",
    eyebrow: "06 / Resume Builder",
    title: "Build a Professional Resume Online for Free",
    description:
      "The resume builder edits, styles, previews, and exports ATS-friendly resumes without leaving the page, with templates for software, healthcare, aviation, and business roles.",
    details: [
      "Professional templates with live preview",
      "PDF viewing and PDF download",
      "Career template switcher with content-only swaps",
      "Editable sections for basic info, contact, education, work experience, projects, skills, certifications, languages, personal details, achievements, and declaration",
      "Example aviation template includes IATA, Sabre, Amadeus, airport operations, cargo operations, and customer communication content",
    ],
    cta: "Builder Details",
    align: "right",
    x: 300,
    z: -6800,
    width: "clamp(410px, 55vw, 880px)",
    tone: "dark",
  },
  {
    id: "contact",
    eyebrow: "07 / Contact",
    title: "Ready to Build Something Amazing?",
    description:
      "I'm always excited to work on new projects and collaborate with innovative teams. Reach me in Abu Dhabi, UAE, or connect online.",
>>>>>>> 8a13a2e (ccc)
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
<<<<<<< HEAD
  skills: 0.22,
  projects: 0.56,
  experience: 0.69,
=======
  about: 0.11,
  skills: 0.22,
  projects: 0.56,
  experience: 0.69,
  resume: 0.81,
>>>>>>> 8a13a2e (ccc)
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
