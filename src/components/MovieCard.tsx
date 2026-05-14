import React from 'react';

interface MovieCardProps {
  title: string;
  poster: string;
  latestEp?: string;
  totalEps?: number;
  isSeries?: boolean;
  onClick?: () => void;
}

const fallbackPoster = 'https://placehold.co/300x450/0b0f17/64748b?text=VTeen';

const MovieCard: React.FC<MovieCardProps> = ({
  title,
  poster,
  latestEp,
  totalEps,
  isSeries,
  onClick
}) => {
  return (
    <button
      type="button"
      className="group block w-full cursor-pointer text-left transition duration-200 active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#070b12] shadow-[0_18px_42px_rgba(0,0,0,0.34)] transition duration-300 group-hover:border-primary/45 group-hover:shadow-[0_20px_48px_rgba(0,0,0,0.42),0_0_24px_rgba(6,182,212,0.12)]">
        <img
          src={poster || fallbackPoster}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-106"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackPoster;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/18 to-black/10 opacity-95" />
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {isSeries && (
            <span className="rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur-md">
              Series
            </span>
          )}
          {latestEp && (
            <span className="rounded-lg bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-widest text-black shadow-lg shadow-primary/25">
              EP {latestEp}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white/75 backdrop-blur-md">
              {totalEps ? `${totalEps} tap` : 'Phim le'}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/12 text-white shadow-xl backdrop-blur-md transition group-hover:border-primary group-hover:bg-primary group-hover:text-black">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div className="px-1 pt-2.5">
        <h3 className="line-clamp-2 min-h-[2.35rem] text-[13px] font-black leading-snug text-white/90 transition group-hover:text-primary">
          {title}
        </h3>
      </div>
    </button>
  );
};

export default React.memo(MovieCard);
