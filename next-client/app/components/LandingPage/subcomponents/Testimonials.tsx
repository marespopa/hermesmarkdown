export default function Testimonials() {
  return (
    <section className="py-16 bg-neutral-50 dark:bg-neutral-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold mb-4 text-neutral-900 dark:text-white">
            Built for Writers & Developers
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            A simple, powerful markdown editor that gets out of your way
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Write Faster</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Focus on content, not formatting</p>
              </div>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300">
              Live markdown preview, smart templates, and intuitive keyboard shortcuts help you write better content faster.
            </p>
          </div>
          
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Stay Private</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Your data never leaves your device</p>
              </div>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300">
              No accounts, no cloud storage, no data collection. Everything stays local and secure on your machine.
            </p>
          </div>
          
          <div className="bg-white dark:bg-neutral-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Export Anywhere</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">PDF or plain markdown</p>
              </div>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300">
              Export your documents to PDF for sharing or keep them as clean markdown files.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 