import { PRODUCTION_ACTIVITIES } from "./dummy-data";
import { StatusBadge } from "./status-badge";

export function ProductionTable() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-800">
          Aktivitas Produksi Terbaru
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-medium">NIK</th>
              <th className="px-5 py-3 font-medium">Mesin</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Berat</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {PRODUCTION_ACTIVITIES.map((activity) => (
              <tr key={activity.nik}>
                <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                  {activity.nik}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                  {activity.mesin}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                  {activity.role}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-700">
                  {activity.berat}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <StatusBadge status={activity.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
