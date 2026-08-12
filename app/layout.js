import "./globals.css";

/* eslint-disable @next/next/no-page-custom-font */

export const metadata = {
  title: {
    default: "Delhi University Results Portal",
    template: "%s · Delhi Results",
  },
  description: "Independent structured semester result and score-card portal.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/assets/portal-mark.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
