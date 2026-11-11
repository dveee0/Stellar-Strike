import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STELLAR STRIKE: Cyber Typing Interceptor",
  description: "Next.js & Node.js Arcade Space Shooter Typing Game with Score-Unlocked Skills & Real-time Co-Op Multiplayer"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0, overflow: "hidden", backgroundColor: "#060913" }}>
        {children}
      </body>
    </html>
  );
}
