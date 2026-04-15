import { useEffect, useMemo, useState } from 'react'
import { BusFront, Clock4, Users } from 'lucide-react'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'

const SEGMENT_SECONDS = 35
const MAX_CAPACITY = 60
const BENGALURU_CENTER = [12.9716, 77.5946]

const route500D = [
  [12.9279, 77.6255],
  [12.9326, 77.622],
  [12.9385, 77.6167],
  [12.9469, 77.6104],
  [12.9548, 77.6013],
  [12.9627, 77.5948],
  [12.9716, 77.5946],
  [12.9785, 77.5852],
  [12.9882, 77.5783],
]

const busStops = [
  { id: 'STOP-01', name: 'Silk Board Junction', routeIndex: 0, location: route500D[0] },
  { id: 'STOP-02', name: 'BTM Layout Water Tank', routeIndex: 1, location: route500D[1] },
  { id: 'STOP-03', name: 'Madiwala Police Station', routeIndex: 2, location: route500D[2] },
  { id: 'STOP-04', name: 'Adugodi Signal', routeIndex: 3, location: route500D[3] },
  { id: 'STOP-05', name: 'Shantinagar TTMC', routeIndex: 4, location: route500D[4] },
  { id: 'STOP-06', name: 'Richmond Circle', routeIndex: 5, location: route500D[5] },
  { id: 'STOP-07', name: 'Majestic Bus Stand', routeIndex: 8, location: route500D[8] },
]

const initialBuses = [
  { id: 'KA-01-F-1234', routeName: '500-D', progress: 0.7, occupancy: 42 },
  { id: 'KA-01-F-2210', routeName: '500-D', progress: 3.2, occupancy: 26 },
  { id: 'KA-01-F-5199', routeName: '500-D', progress: 5.9, occupancy: 14 },
]

const stopIcon = L.divIcon({
  html: '<div class="stop-marker"></div>',
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const busIcon = L.divIcon({
  html: '<div class="bus-marker">B</div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const getCongestion = (occupancy) => {
  if (occupancy >= 40) return { label: 'High (Full/No Boarding)', color: 'bg-red-500/20 text-red-300' }
  if (occupancy >= 25) return { label: 'Moderate (Standing Only)', color: 'bg-amber-500/20 text-amber-300' }
  return { label: 'Low (Seats Available)', color: 'bg-emerald-500/20 text-emerald-300' }
}

const getBusPosition = (progress) => {
  const startIndex = Math.floor(progress)
  const endIndex = (startIndex + 1) % route500D.length
  const blend = progress - startIndex
  const [startLat, startLng] = route500D[startIndex]
  const [endLat, endLng] = route500D[endIndex]
  return [
    startLat + (endLat - startLat) * blend,
    startLng + (endLng - startLng) * blend,
  ]
}

const getEtaMinutes = (busProgress, stopIndex) => {
  const routeLength = route500D.length
  const rawSegments = (stopIndex - busProgress + routeLength) % routeLength
  const etaSeconds = Math.max(45, Math.round(rawSegments * SEGMENT_SECONDS))
  return Math.ceil(etaSeconds / 60)
}

const getPassengerPercent = (occupancy) => Math.round((occupancy / MAX_CAPACITY) * 100)

function App() {
  const [buses, setBuses] = useState(initialBuses)
  const [selectedStopId, setSelectedStopId] = useState(busStops[0].id)

  useEffect(() => {
    const timer = setInterval(() => {
      setBuses((prevBuses) =>
        prevBuses.map((bus) => {
          const nextProgress = (bus.progress + 0.06) % route500D.length
          const occupancyShift = Math.floor(Math.random() * 11) - 5
          const nextOccupancy = Math.min(MAX_CAPACITY, Math.max(10, bus.occupancy + occupancyShift))
          return { ...bus, progress: nextProgress, occupancy: nextOccupancy }
        }),
      )
    }, 2000)

    return () => clearInterval(timer)
  }, [])

  const selectedStop = useMemo(
    () => busStops.find((stop) => stop.id === selectedStopId) ?? busStops[0],
    [selectedStopId],
  )

  const arrivingBuses = useMemo(() => {
    return [...buses]
      .map((bus) => ({
        ...bus,
        etaMinutes: getEtaMinutes(bus.progress, selectedStop.routeIndex),
        congestion: getCongestion(bus.occupancy),
      }))
      .sort((a, b) => a.etaMinutes - b.etaMinutes)
      .slice(0, 2)
  }, [buses, selectedStop.routeIndex])

  const primaryBus = arrivingBuses[0]
  const secondaryBus = arrivingBuses[1]

  const recommendation = useMemo(() => {
    if (!primaryBus) return 'Select a stop to view recommendation.'
    if (primaryBus.occupancy >= 40 && secondaryBus) {
      const freePercent = 100 - getPassengerPercent(secondaryBus.occupancy)
      return `⚠️ This bus is full. Next bus (${secondaryBus.routeName}) arrives in ${secondaryBus.etaMinutes} mins and is ${freePercent}% empty. Recommendation: WAIT.`
    }
    return '✅ Board now. High probability of finding a seat.'
  }, [primaryBus, secondaryBus])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:p-5">
        <section className="h-[52vh] overflow-hidden rounded-2xl border border-sky-900/60 bg-slate-900 lg:h-full lg:flex-1">
          <MapContainer center={BENGALURU_CENTER} zoom={12} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={route500D} pathOptions={{ color: '#38bdf8', weight: 5 }} />
            {busStops.map((stop) => (
              <Marker
                key={stop.id}
                position={stop.location}
                icon={stopIcon}
                eventHandlers={{ click: () => setSelectedStopId(stop.id) }}
              >
                <Popup>
                  <div>
                    <strong>{stop.name}</strong>
                    <p className="m-0 text-xs">Tap to show next arrivals</p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {buses.map((bus) => (
              <Marker key={bus.id} position={getBusPosition(bus.progress)} icon={busIcon}>
                <Popup>
                  <strong>{bus.id}</strong>
                  <p className="m-0 text-xs">Route {bus.routeName}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        <aside className="w-full rounded-2xl border border-sky-900/60 bg-gradient-to-b from-slate-900 to-slate-950 p-4 lg:w-[380px]">
          <h1 className="text-2xl font-bold text-sky-200">Sahayak-Bus</h1>
          <p className="mt-1 text-sm text-slate-300">BMTC smart commute assistant for confident boarding.</p>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <p className="text-xs uppercase tracking-wide text-sky-300">Selected stop</p>
            <h2 className="mt-1 text-lg font-semibold">{selectedStop.name}</h2>
            <p className="text-sm text-slate-300">Tap any stop marker to refresh next arrivals.</p>
          </div>

          <div className="mt-4 space-y-3">
            {arrivingBuses.map((bus) => (
              <article key={bus.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-300">Bus ID</p>
                    <p className="font-semibold">{bus.id}</p>
                  </div>
                  <span className="rounded-md bg-sky-500/20 px-2 py-1 text-xs text-sky-300">{bus.routeName}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="flex items-center gap-1 text-slate-300">
                      <Clock4 size={14} /> ETA
                    </p>
                    <p className="font-medium">{bus.etaMinutes} mins</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-2">
                    <p className="flex items-center gap-1 text-slate-300">
                      <Users size={14} /> Occupancy
                    </p>
                    <p className="font-medium">{bus.occupancy} passengers</p>
                  </div>
                </div>
                <div className={`mt-3 rounded-lg px-2 py-1 text-xs font-medium ${bus.congestion.color}`}>
                  Congestion: {bus.congestion.label}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-sky-200">
              <BusFront size={16} />
              Wait vs. Go Recommendation
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{recommendation}</p>
          </div>

          <div className="mt-4 rounded-xl border border-sky-900/70 bg-sky-950/30 p-3 text-xs text-sky-100">
            Simulated feed updates every 2 seconds. Occupancy fluctuates between 10-60 passengers to mimic live UPI ticketing pulses.
          </div>
        </aside>
      </div>
    </main>
  )
}

export default App
