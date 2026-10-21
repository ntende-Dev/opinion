/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  /**
   * Desks the paper has closed. Redirects are checked before the filesystem,
   * so an old desk URL lands on the desk that now holds the beat instead of
   * the 404 spike. ad-hoc desk renames go here as they happen.
   */
  redirects: async () =>
    [
      // The old Investigations desk was folded into the culture desk.
      {
        source: "/section/investigations",
        destination: "/section/entertainment",
        permanent: true,
      },
    ]
};

export default nextConfig;
