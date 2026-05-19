import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Download } from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonList } from '../components/ui/SkeletonCard';
import type { Resource, TeacherPack } from '@zerolink/shared';

const TYPE_LABELS: Record<string, string> = {
  library: 'Library', wifi_spot: 'Wi-Fi Spot', device_loan: 'Device Loan', other: 'Other',
};

export function CommunityPage() {
  const [filter, setFilter] = useState<'all' | 'library' | 'wifi_spot' | 'device_loan'>('all');
  const [packDownloading, setPackDownloading] = useState<string | null>(null);

  const { data: resources, isLoading: resLoading } = useQuery<Resource[]>({
    queryKey: ['resources', filter],
    queryFn: async () => {
      const res = await api.get('/resources', { params: filter !== 'all' ? { type: filter } : {} });
      return res.data.data;
    },
  });

  const { data: packs, isLoading: packsLoading } = useQuery<TeacherPack[]>({
    queryKey: ['teacherPacks'],
    queryFn: async () => {
      const res = await api.get('/teacher-packs', { params: { approved: true } });
      return res.data.data;
    },
  });

  const handleDownloadPack = async (pack: TeacherPack) => {
    setPackDownloading(pack.id);
    try {
      const res = await api.get(`/teacher-packs/${pack.id}/download`);
      window.open(res.data.data.url, '_blank');
    } catch { /* show toast */ }
    setPackDownloading(null);
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'library', label: '📚 Libraries' },
    { key: 'wifi_spot', label: '📡 Wi-Fi Spots' },
    { key: 'device_loan', label: '📱 Device Loans' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-earth-800">🏘️ The Village</h1>
        <p className="text-earth-500 mt-1">Community resources and teacher-curated packs</p>
      </div>

      {/* Resources */}
      <section aria-labelledby="resources-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="resources-title">
          <MapPin className="w-5 h-5 inline-block mr-2 text-earth-400" aria-hidden="true" />
          Local Resources
        </h2>

        <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label="Filter resources by type">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === f.key ? 'bg-earth-400 text-white' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'
              }`}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
        </div>

        {resLoading ? (
          <SkeletonList count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resources?.map(r => (
              <div key={r.id} className="card card-hover">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs bg-earth-100 text-earth-600 font-bold px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[r.type] ?? r.type}
                    </span>
                    <h3 className="font-bold text-earth-800 mt-2">{r.name}</h3>
                  </div>
                  {r.verified && (
                    <span className="text-xs bg-olive-100 text-olive-700 font-bold px-2 py-0.5 rounded-full">✓ Verified</span>
                  )}
                </div>
                {r.description && <p className="text-earth-500 text-sm mb-3">{r.description}</p>}
                {r.address && (
                  <p className="text-earth-400 text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" /> {r.address}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-3">
                  {r.languages.map(l => (
                    <span key={l} className="text-xs bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
            ))}
            {resources?.length === 0 && (
              <p className="col-span-2 text-center text-earth-400 py-8">No resources found in this category.</p>
            )}
          </div>
        )}
      </section>

      {/* Teacher Packs */}
      <section aria-labelledby="packs-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="packs-title">📦 Teacher Packs</h2>
        {packsLoading ? (
          <SkeletonList count={2} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packs?.map(pack => (
              <div key={pack.id} className="card card-hover">
                <h3 className="font-bold text-earth-800 mb-2">{pack.title}</h3>
                {pack.description && <p className="text-earth-500 text-sm mb-3">{pack.description}</p>}
                <div className="flex flex-wrap gap-2 mb-4">
                  {pack.languages.map(l => (
                    <span key={l} className="text-xs bg-earth-100 text-earth-600 font-semibold px-2 py-0.5 rounded-full">{l}</span>
                  ))}
                  {pack.sizeBytes && (
                    <span className="text-xs bg-sky-100 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                      {Math.round(pack.sizeBytes / 1024 / 1024)} MB
                    </span>
                  )}
                  <span className="text-xs text-earth-400">{pack.downloads} downloads</span>
                </div>
                <button
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                  onClick={() => handleDownloadPack(pack)}
                  disabled={packDownloading === pack.id}
                  aria-label={`Download ${pack.title}`}
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {packDownloading === pack.id ? 'Downloading…' : 'Download Pack'}
                </button>
              </div>
            ))}
            {packs?.length === 0 && (
              <p className="col-span-2 text-center text-earth-400 py-8">No approved packs yet.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
