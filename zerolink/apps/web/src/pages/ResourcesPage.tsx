import { useEffect, useState } from 'react';
import { ExternalLink, Download, Wifi, WifiOff, MapPin, Search } from 'lucide-react';
import { RESOURCES, RESOURCE_CATEGORIES, type ResourceCategory } from '../lib/resources';
import { detectCity, type City } from '../lib/geoLookup';

const FORMAT_ICONS: Record<string, string> = {
  video: '🎥', interactive: '🖱️', printable: '🖨️', audio: '🎧', article: '📰', tool: '🛠️',
};

export function ResourcesPage() {
  const [category, setCategory] = useState<ResourceCategory | 'all'>('all');
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [freeOnly, setFreeOnly]     = useState(true);
  const [search, setSearch]         = useState('');
  const [city, setCity]             = useState<City | null>(null);
  const [locating, setLocating]     = useState(false);

  const handleLocate = async () => {
    setLocating(true);
    const c = await detectCity();
    setCity(c);
    setLocating(false);
  };

  useEffect(() => { void handleLocate(); }, []);

  const filtered = RESOURCES.filter(r => {
    if (category !== 'all' && r.category !== category) return false;
    if (offlineOnly && !r.offline) return false;
    if (freeOnly && !r.free) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-earth-800">Learning Resources</h1>
        <p className="text-earth-500 text-sm mt-1">Curated free and low-bandwidth resources for every learner.</p>
      </div>

      {/* Location badge */}
      <div className="flex items-center gap-3">
        {city ? (
          <div className="flex items-center gap-1.5 text-xs text-earth-500 bg-earth-50 border border-earth-200 rounded-full px-3 py-1">
            <MapPin className="w-3 h-3" />
            <span>{city.name}, {city.country}</span>
          </div>
        ) : (
          <button
            onClick={handleLocate}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs text-earth-500 hover:text-earth-700 bg-earth-50 border border-earth-200 rounded-full px-3 py-1 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            {locating ? 'Locating…' : 'Detect my location'}
          </button>
        )}
        {city && (
          <button
            onClick={handleLocate}
            disabled={locating}
            className="text-xs text-earth-400 hover:text-earth-600"
          >
            {locating ? 'Locating…' : 'Change'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
          <input
            type="search"
            placeholder="Search resources…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {RESOURCE_CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                category === c.key
                  ? 'bg-earth-700 text-white border-earth-700'
                  : 'bg-white text-earth-600 border-earth-200 hover:border-earth-400'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Toggle filters */}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={offlineOnly}
              onChange={e => setOfflineOnly(e.target.checked)}
              className="rounded border-earth-300"
            />
            <WifiOff className="w-3.5 h-3.5 text-earth-500" />
            <span className="text-earth-600">Offline-capable only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={e => setFreeOnly(e.target.checked)}
              className="rounded border-earth-300"
            />
            <span className="text-earth-600">Free only</span>
          </label>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-earth-400 font-semibold">{filtered.length} resource{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-earth-400">
          <p className="text-lg font-semibold">No resources match your filters.</p>
          <p className="text-sm mt-1">Try removing some filters or broadening your search.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-white border border-earth-200 rounded-2xl p-4 space-y-2 hover:shadow-md transition-shadow">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-earth-800 text-sm leading-tight">{r.title}</h3>
                  {r.region && (
                    <span className="text-xs text-earth-400">{r.region}</span>
                  )}
                </div>
                <span className="text-xl shrink-0" title={r.format}>{FORMAT_ICONS[r.format] ?? '📄'}</span>
              </div>

              <p className="text-xs text-earth-600 leading-relaxed">{r.description}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-earth-100 text-earth-600 font-medium capitalize">{r.category}</span>
                {r.offline && (
                  <span className="px-2 py-0.5 rounded-full bg-olive-50 text-olive-700 border border-olive-200 font-medium flex items-center gap-1">
                    <WifiOff className="w-2.5 h-2.5" />Offline
                  </span>
                )}
                {!r.offline && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium flex items-center gap-1">
                    <Wifi className="w-2.5 h-2.5" />Online
                  </span>
                )}
                {r.free ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Free</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">Paid</span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-earth-50 text-earth-500 font-medium">{r.language}</span>
              </div>

              {/* Action */}
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-earth-600 hover:text-earth-800 transition-colors pt-1"
              >
                {r.offline ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                {r.offline ? 'Get resource' : 'Open resource'}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
