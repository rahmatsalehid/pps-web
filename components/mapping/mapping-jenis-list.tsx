export function MappingJenisBulletList({
  items,
}: {
  items: { namaJenis: string }[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
        -
      </div>
    );
  }

  const shown = items.slice(0, 2);
  const extra = items.length - shown.length;

  return (
    <div className="h-full overflow-y-auto">
      {shown.map((j, i) => (
        <div key={`${j.namaJenis}-${i}`} className="flex items-start py-px">
          <span className="text-[11px] leading-tight text-gray-400">•</span>
          <span className="ml-[3px] line-clamp-3 text-[10px] leading-tight text-black">
            {j.namaJenis}
          </span>
        </div>
      ))}
      {extra > 0 && (
        <p className="pl-2.5 text-[9.5px] italic text-gray-400">
          +{extra} lainnya
        </p>
      )}
    </div>
  );
}
