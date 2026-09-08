// Structured profile data — the source of truth for the AI assistant's
// context and anywhere else that needs the raw facts rather than the
// hand-written flight-card prose in sections.ts.

export const skills = [
  { name: "React JS", level: "Expert" },
  { name: "Next.js", level: "Expert" },
  { name: "TypeScript", level: "Expert" },
  { name: "JavaScript", level: "Expert" },
  { name: "HTML5", level: "Expert" },
  { name: "CSS3", level: "Expert" },
  { name: "Tailwind CSS", level: "Expert" },
  { name: "Redux", level: "Expert" },
  { name: "Node.js", level: "Intermediate" },
  { name: "Material-UI", level: "Expert" },
  { name: "Git", level: "Intermediate" },
  { name: "Jenkins", level: "Intermediate" },
];

export const projects = [
  {
    name: "Dashboard v2 — Transaction & Revenue Monitoring",
    about:
      "Led migration of a legacy Angular multi-tenant transaction and operations dashboard into a fast, component-driven Next.js + TypeScript frontend. Implemented multi-tenant support, role/permission access, transaction monitoring, KYC workflows, billing analytics, secure document/media handling, and server-side APIs for exports and heavy operations.",
    stacks: ["Next.js", "React", "TypeScript", "Node.js", "Docker"],
  },
  {
    name: "AI Chatbots",
    about:
      "Developed AI-powered chatbot interfaces and a real-time monitoring dashboard using React.js, HTML5, and CSS to streamline accident assessment and reporting.",
    stacks: ["React.js", "JavaScript", "HTML", "CSS", "Bootstrap"],
  },
  {
    name: "Loyalty Platform",
    about:
      "Built a loyalty app with Next.js, focusing on a robust, high-performance platform to boost customer engagement and retention.",
    stacks: ["Next.js", "TypeScript", "HTML", "CSS", "Tailwind CSS"],
  },
  {
    name: "Get-Life",
    about:
      "Designed and developed dynamic UI components and pages for GetLife Insurance UK using Gatsby.js, TypeScript, and Tailwind CSS.",
    stacks: ["Angular.js", "JavaScript", "HTML", "CSS", "Bootstrap"],
  },
  {
    name: "Confidential",
    about:
      "Designed and developed dynamic UI components and pages for a leading U.S.-based insurance company using React.js, Node.js, Redux, and Bootstrap.",
    stacks: ["React.js", "Redux-saga", "HTML", "CSS", "Bootstrap"],
  },
];

export const CAREER_START_DATE = new Date("2018-08-01");

export function getYearsOfExperience(): number {
  const years =
    (Date.now() - CAREER_START_DATE.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years);
}

export const experiences = [
  {
    title: "Application Developer",
    company: "Emirates Face Recognition",
    location: "Abu Dhabi, United Arab Emirates",
    period: "Feb 2025 - Present",
    description:
      "Building AI-powered face recognition systems and enterprise dashboards for biometric solutions.",
    achievements: [
      "Developing scalable frontend applications using React and Next.js for face recognition platforms",
      "Architecting real-time monitoring dashboards for biometric transaction processing",
      "Implementing modern UI/UX designs with focus on performance and accessibility",
      "Collaborating with AI/ML teams to integrate computer vision features into web applications",
    ],
    technologies: ["React", "Next.js", "TypeScript", "Redux", "Tailwind CSS"],
  },
  {
    title: "Development Team Lead",
    company: "Epixel Solutions",
    location: "Kochi, Kerala",
    period: "Nov 2022 - May 2024",
    description:
      "Led frontend development team building MLM software solutions and enterprise web applications.",
    achievements: [
      "Led a team of developers delivering high-quality MLM software products",
      "Architected scalable frontend solutions using React and modern JavaScript frameworks",
      "Established coding standards and best practices improving code quality by 40%",
      "Mentored junior developers and conducted code reviews to ensure delivery excellence",
    ],
    technologies: ["React", "Next.js", "TypeScript", "Redux", "Material-UI"],
  },
  {
    title: "Software Engineer",
    company: "Aspire Systems",
    location: "Kochi, Kerala",
    period: "Nov 2020 - Oct 2022",
    description:
      "Developed enterprise web applications and customer-facing solutions for global clients.",
    achievements: [
      "Built responsive web applications using React.js serving thousands of users",
      "Implemented state management solutions using Redux for complex application workflows",
      "Collaborated with cross-functional teams to deliver projects on tight deadlines",
      "Integrated RESTful APIs and third-party services into frontend applications",
    ],
    technologies: ["React", "JavaScript", "Redux", "Jenkins", "REST APIs"],
  },
  {
    title: "UI Developer",
    company: "Uvionics Tech India Pvt Ltd",
    location: "Koratty, India",
    period: "Aug 2018 - Nov 2020",
    description:
      "Started career building user interfaces and interactive web experiences for various clients.",
    achievements: [
      "Developed pixel-perfect UI components from design mockups using HTML, CSS, and JavaScript",
      "Built reusable component libraries improving development efficiency across projects",
      "Implemented responsive designs ensuring cross-browser compatibility",
      "Gained expertise in React.js and modern frontend development practices",
    ],
    technologies: ["React", "JavaScript", "HTML5", "CSS3", "Bootstrap"],
  },
];

export const aboutMe =
  "I'm Umar Suhail, a software developer from Thrissur, Kerala, currently based in Abu Dhabi, UAE. As a Lead Frontend Engineer with 7+ years of experience, I build high-performance web applications at Emirates Face Recognition (EFR), Abu Dhabi. My career spans UI Developer at Uvionics Tech (India), Software Engineer at Aspire Systems (India), Development Team Lead at Epixel Solutions (India), and now Application Developer at EFR (UAE). I specialise in React, Next.js, TypeScript, Redux Toolkit, Tailwind CSS, and UI/UX design with Figma and Adobe Creative Suite.";

export const contact = {
  email: "umarsuhail112@gmail.com",
  linkedin: "linkedin.com/in/umar-suhail",
  github: "github.com/umarsuhail",
};
