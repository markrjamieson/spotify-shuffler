export const metadata = {
  title: "Spotify Shuffler",
  description: "Create and update podcast shuffler playlists",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 640,
          margin: "0 auto",
          padding: "2rem 1rem",
          background: "#0d1117",
          color: "#e6edf3",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
