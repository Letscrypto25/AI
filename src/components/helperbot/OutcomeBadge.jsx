export default function OutcomeBadge({ outcome }) {
  const map = {
    done:    { label: "✅ Done",    cls: "bg-green-100 text-green-800" },
    blocked: { label: "❌ Blocked", cls: "bg-red-100 text-red-800" },
    partial: { label: "⚠️ Partial", cls: "bg-yellow-100 text-yellow-800" },
    info:    { label: "💬 Info",    cls: "bg-blue-100 text-blue-800" },
  };
  const o = map[outcome] || { label: outcome, cls: "bg-gray-100 text-gray-700" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${o.cls}`}>{o.label}</span>;
}
