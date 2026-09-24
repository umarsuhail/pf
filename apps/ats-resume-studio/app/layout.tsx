import './globals.css';
export const metadata={title:'ATS Resume Studio',description:'Edit LaTeX resumes, compile searchable PDFs, and validate ATS readability.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}