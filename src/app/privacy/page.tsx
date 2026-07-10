export const metadata = {
  title: "Privacy Policy — Spare Me",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="mb-2 text-2xl font-extrabold">Privacy Policy</h1>
      <p className="mb-8 text-xs text-text-muted">Last updated: 10 July 2026</p>

      <div className="flex flex-col gap-6 text-sm text-text-secondary">
        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">
            What we collect
          </h2>
          <p>
            Spare Me stores the information you provide when you create an
            account and log your bowling games: your email address, display
            name, optional avatar photo, and your game data (scores, frames,
            venues, session dates). If you enable notifications, we store a push
            subscription for your device.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">
            How we use it
          </h2>
          <p>
            Your data is used only to run the app: calculating your stats and
            rank, showing leaderboards to other signed-in players, and sending
            you notifications you opted into. We do not sell your data, show
            ads, or share your information with third parties for marketing.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">Camera</h2>
          <p>
            The lane tracker feature uses your camera to record your throws.
            Video is processed on your device. Recordings are not uploaded
            unless you explicitly choose to save or share them.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">
            Where it lives
          </h2>
          <p>
            Data is stored with Supabase (database and authentication) and the
            app is hosted on Vercel. Both encrypt data in transit. We collect
            anonymous usage analytics via Vercel Analytics, which does not use
            cookies or track you across sites.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">
            Deleting your data
          </h2>
          <p>
            You can permanently delete your account and all associated data at
            any time from Profile → Settings → Delete Account. Deletion is
            immediate and irreversible.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-text-primary">
            Contact
          </h2>
          <p>
            Questions about your data? Email{" "}
            <a href="mailto:support@spareme.club" className="text-blue">
              support@spareme.club
            </a>
            , or use the in-app feedback form under Profile → Settings.
          </p>
        </section>
      </div>
    </main>
  );
}
