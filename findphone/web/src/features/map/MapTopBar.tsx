import { Box, LoaderCircle, Map as MapIcon, MapPin, Satellite, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { actions, useApp } from '../../app/store';
import { cn, focusRing } from '../../design-system/cn';
import { Segmented } from '../../design-system/components/Segmented';
import { type LatLng, type PlaceResult, searchPlaces } from '../places/geoServices';

/** Floating bar over the map: place search (type-ahead) and Satellite / Map / 3D. */
export function MapTopBar({ near, compact = false }: { near: LatLng | null; compact?: boolean }) {
  const mode = useApp((s) => s.mapMode);
  return (
    <div className="pointer-events-none absolute top-4 right-4 left-4 z-(--fp-z-panel) flex flex-wrap items-start gap-3 md:right-auto">
      <PlaceSearch near={near} />
      <Segmented
        label="Map view"
        value={mode}
        onChange={actions.setMapMode}
        size={compact ? 'sm' : 'md'}
        className="pointer-events-auto"
        options={[
          { value: 'satellite', label: 'Satellite', icon: compact ? undefined : Satellite },
          { value: 'map', label: 'Map', icon: compact ? undefined : MapIcon },
          { value: '3d', label: '3D', icon: compact ? undefined : Box },
        ]}
      />
    </div>
  );
}

function PlaceSearch({ near }: { near: LatLng | null }) {
  const place = useApp((s) => s.place);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);

  // Debounced type-ahead; the previous request is cancelled when the query changes.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const id = window.setTimeout(() => {
      setLoading(true);
      searchPlaces(q, near, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setResults([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      ctrl.abort();
      window.clearTimeout(id);
    };
    // `near` only biases ranking; don't refetch every time the phone moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = (r: PlaceResult) => {
    actions.showPlace(r);
    setQuery(r.name);
    setOpen(false);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    actions.showPlace(null);
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={root} className="pointer-events-auto relative min-w-0 flex-1 basis-60 md:w-80 md:flex-none xl:w-96">
      <div className="fp-glass flex h-12 items-center gap-3 rounded-lg px-4 focus-within:outline-2 focus-within:outline-accent">
        {loading ? (
          <LoaderCircle aria-hidden size={18} className="fp-spin shrink-0 text-accent" />
        ) : (
          <Search aria-hidden size={18} className="shrink-0 text-secondary" />
        )}
        <input
          role="combobox"
          aria-label="Search for a place"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              const r = results[active >= 0 ? active : 0];
              if (r) pick(r);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Search a place, landmark or address…"
          className="h-full min-w-0 flex-1 bg-transparent text-body text-primary outline-none placeholder:text-tertiary"
        />
        {(query || place) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className={cn('-mr-2 flex size-9 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-hover', focusRing)}
          >
            <X aria-hidden size={16} />
          </button>
        )}
      </div>

      {showList && (
        <ul id={listId} role="listbox" aria-label="Places" className="fp-glass-strong fp-enter absolute top-full right-0 left-0 mt-2 overflow-hidden rounded-lg p-1">
          {results.length === 0 && !loading && <li className="px-3 py-3 text-body text-secondary">No places found.</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={cn('flex cursor-pointer items-start gap-3 rounded-md px-3 py-2', i === active ? 'bg-hover' : 'hover:bg-hover')}
            >
              <MapPin aria-hidden size={16} className="mt-1 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block truncate text-label text-primary">{r.name}</span>
                {r.detail && <span className="block truncate text-caption text-tertiary">{r.detail}</span>}
              </span>
            </li>
          ))}
          <li className="px-3 pt-1 pb-2 text-caption text-tertiary">Search by Photon · © OpenStreetMap</li>
        </ul>
      )}
    </div>
  );
}
