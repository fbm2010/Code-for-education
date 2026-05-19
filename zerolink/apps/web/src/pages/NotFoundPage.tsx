import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-6">
      <div className="card max-w-md w-full text-center py-12">
        <div className="text-6xl mb-4">🧭</div>
        <h1 className="text-3xl font-black text-earth-800 mb-3">Trail Not Found</h1>
        <p className="text-earth-500 mb-6">This camp doesn't exist on our map.</p>
        <Link to="/" className="btn-primary inline-block">Return to Base Camp</Link>
      </div>
    </div>
  );
}
