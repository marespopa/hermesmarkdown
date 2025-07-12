import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center">
      <h1 className="text-8xl font-extrabold text-emerald-600">404</h1>
      <p className="mt-4 text-2xl text-gray-700 dark:text-gray-300">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-6 px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 focus:bg-emerald-700 focus:ring-emerald-500 text-lg font-medium rounded transition duration-200"
      >
        Go Back Home
      </Link>
    </div>
  );
}
