import React from 'react';
import { usePrayana } from '../../../context/PrayanaContext';
import { PopCard } from '../../ui/InteractivePrimitives';
import { CheckCircle2, RefreshCw, Utensils, BedDouble } from 'lucide-react';

export const DiningStaysPage: React.FC = () => {
  const {
    diningOptions,
    placesData,
    placesLoading,
    refreshDestinationPlaces,
    travelers,
    activeDestination,
    theme,
  } = usePrayana();
  const isLight = theme === 'light';

  const groupAllergies = Array.from(
    new Set(travelers.flatMap(t => t.dietaryTags.filter(d => d.includes('Allergy') || d === 'Gluten-Free')))
  );

  return (
    <div className="w-full space-y-5 pb-12 font-mono text-[11px] select-none">
      {/* Top Status & Overpass Refresh Bar */}
      <div className="p-4 bg-[#121212] border border-[rgba(242,240,235,0.12)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Utensils className="w-4 h-4 text-ink-primary shrink-0" />
          <div>
            <div className="text-[10px] font-bold text-ink-primary uppercase tracking-widest">
              LIVE OPENSTREETMAP OVERPASS // {activeDestination.name.toUpperCase()}
            </div>
            <div className="text-[9px] text-ink-secondary">
              ALLERGEN & DIET FILTER: {groupAllergies.join(', ') || 'NONE CONFIGURED'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-[9px] font-bold uppercase ${
              placesData?.source?.startsWith('openstreetmap_overpass') ? 'text-semantic-nominal' : 'text-amber-400'
            }`}
          >
            {placesLoading ? 'QUERYING OVERPASS...' : placesData?.source || 'NO LIVE DATA'}
          </span>
          <button
            type="button"
            onClick={() => refreshDestinationPlaces()}
            disabled={placesLoading}
            className="px-3 py-1.5 bg-[#1B1B1B] border border-[rgba(242,240,235,0.2)] text-ink-primary hover:border-ink-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-[10px]"
          >
            <RefreshCw className={`w-3 h-3 ${placesLoading ? 'animate-spin' : ''}`} />
            <span>REFRESH OSM</span>
          </button>
        </div>
      </div>

      {placesData?.disclaimer && (
        <div className="p-3 bg-[#161616] border border-[rgba(242,240,235,0.1)] text-[9px] font-sans text-ink-secondary">
          {placesData.disclaimer}
        </div>
      )}

      {/* 12-Column Dining (Cols 1-7) & Stays + Cohort Filter (Cols 8-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Recommended Dining */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-[9px] text-ink-muted uppercase tracking-widest pb-1.5 border-b border-[rgba(242,240,235,0.08)] flex justify-between">
            <span>ALLERGY-SCREENED DINING VENUES</span>
            <span className="text-ink-primary font-bold">{diningOptions.length} VENUES</span>
          </div>

          {placesLoading && diningOptions.length === 0 ? (
            <div className="p-8 text-center text-[10px] text-ink-secondary border border-[rgba(242,240,235,0.1)] bg-[#141414]">
              QUERYING LIVE OPENSTREETMAP OVERPASS RESTAURANTS & STAYS AROUND {activeDestination.name.toUpperCase()}...
            </div>
          ) : diningOptions.length === 0 ? (
            <div className="p-8 text-center text-[10px] text-ink-muted border border-[rgba(242,240,235,0.1)] bg-[#141414] space-y-3">
              <div>NO LIVE OVERPASS VENUES RETURNED FOR THIS SECTOR.</div>
              <button
                type="button"
                onClick={() => refreshDestinationPlaces()}
                className="px-4 py-1.5 bg-ink-primary text-canvas font-bold cursor-pointer"
              >
                [ RETRY OVERPASS QUERY ]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {diningOptions.slice(0, 12).map(din => {
                const hasAllergenConflict = din.allergenFlags.some(a => groupAllergies.includes(a as any));

                return (
                  <PopCard
                    key={din.id}
                    className={`p-3.5 transition-colors duration-150 ${
                      hasAllergenConflict
                        ? isLight
                          ? 'border-red-300 bg-red-50'
                          : 'border-semantic-hazard/50 bg-[#221515]'
                        : 'border-[rgba(242,240,235,0.12)] bg-[#161616]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-serif text-lg text-ink-primary leading-tight truncate">
                          {din.name}
                        </h4>
                        <div className="text-[9px] text-ink-secondary mt-0.5">
                          {din.cuisine} · {din.distanceKm} km from hub
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-bold text-ink-primary">
                          ~₹{din.costForTwo} <span className="text-[8px] font-normal text-ink-muted">est.</span>
                        </div>
                        <div className="text-[8px] text-ink-muted">
                          OSM {din.categoryTag?.toUpperCase() || 'DINING'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(din.osmVerifiedTags || []).map(tag => (
                        <span
                          key={tag}
                          className={`px-1.5 py-0.5 border text-[8px] font-bold ${
                            isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-[#152418] border-semantic-nominal/60 text-semantic-nominal'
                          }`}
                        >
                          [OSM DIET] {tag}
                        </span>
                      ))}
                      {din.allergenFlags.map(af => (
                        <span
                          key={af}
                          className={`px-1.5 py-0.5 border text-[8px] font-bold ${
                            isLight
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-[#2D1616] border-semantic-hazard text-semantic-hazard'
                          }`}
                        >
                          HEURISTIC RISK: {af.toUpperCase()}
                        </span>
                      ))}
                      {!din.isOsmDietVerified && (din.heuristicNotes || []).map((note, ni) => (
                        <span key={ni} className="px-1.5 py-0.5 bg-[#202020] border border-[rgba(242,240,235,0.12)] text-ink-muted text-[8px]">
                          {note}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[rgba(242,240,235,0.08)] flex items-center justify-between text-[8px]">
                      <span className="text-ink-muted truncate max-w-[60%]">{din.address}</span>
                      {hasAllergenConflict ? (
                        <span className="text-semantic-hazard font-bold">
                          ⚠ HEURISTIC ALLERGEN WARNING
                        </span>
                      ) : din.isOsmDietVerified ? (
                        <span className="text-semantic-nominal font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> OSM DIET TAGGED
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold">
                          CONFIRM WITH STAFF
                        </span>
                      )}
                    </div>
                  </PopCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live OSM Accommodations */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[9px] text-ink-muted uppercase tracking-widest pb-1.5 border-b border-[rgba(242,240,235,0.08)] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-ink-primary" />
              <span>LIVE OPENSTREETMAP ACCOMMODATIONS</span>
            </span>
            <span className="text-ink-primary font-bold">{placesData?.stays?.length ?? 0} STAYS</span>
          </div>

          {placesData && placesData.stays.length > 0 ? (
            <div className="space-y-2.5">
              {placesData.stays.slice(0, 8).map(stay => (
                <div
                  key={stay.id}
                  className="p-3.5 bg-[#151515] border border-[rgba(242,240,235,0.12)] flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-serif text-lg text-ink-primary truncate">{stay.name}</div>
                    <div className="text-[9px] text-ink-muted truncate mt-0.5">
                      {stay.category_tag.replace('_', ' ').toUpperCase()} · {stay.distance_km} km · {stay.address}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-ink-primary">~₹{stay.estimated_cost_for_two}</div>
                    <div className="text-[8px] text-ink-muted">EST / NIGHT</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-[10px] text-ink-muted border border-[rgba(242,240,235,0.1)] bg-[#141414]">
              {placesLoading ? 'LOADING ACCOMMODATIONS...' : 'NO STAYS RETURNED IN CURRENT RADIUS.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
