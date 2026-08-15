export default function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
      </div>
      <p className="text-sm text-gray-400 animate-pulse">{label}</p>
    </div>
  );
}
