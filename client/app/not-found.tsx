export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          404 – Page Not Found
        </h2>
        <a href="/" className="text-blue-600 hover:underline">
          Return to Vehicle Selector
        </a>
      </div>
    </div>
  );
}
