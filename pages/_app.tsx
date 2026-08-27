import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Inter, Space_Grotesk } from 'next/font/google';
import DemoBanner from '@/components/DemoBanner';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap' });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Blue Hill Dashboard: Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="description"
          content="Interactive demo of a property-management dashboard: per-property tracking of rates, water, leases and inspections with severity-based alerting. Sample data only."
        />
      </Head>
      {/* Font vars live on :root so portalled overlays (Sheet, menus) inherit them too. */}
      <style jsx global>{`
        :root {
          --font-body: ${inter.style.fontFamily};
          --font-display: ${spaceGrotesk.style.fontFamily};
        }
      `}</style>
      <DemoBanner />
      <Component {...pageProps} />
    </>
  );
}
