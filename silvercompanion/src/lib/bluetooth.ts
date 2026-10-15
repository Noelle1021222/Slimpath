/**
 * Web Bluetooth sync for standard GATT health devices (blood pressure monitor,
 * heart-rate strap, thermometer, scale). Works in Chrome/Edge on Android,
 * Windows, macOS and ChromeOS; iOS browsers do not expose Web Bluetooth, so the
 * UI falls back to a clearly-labelled simulated reading.
 */
import type { HealthLog } from '@/types'
import { parseBloodPressure, parseHeartRate, parseTemperature, parseWeight } from './ble'

export interface BluetoothReading {
  bp_high?: number
  bp_low?: number
  heart_rate?: number
  temperature?: number
  weight?: number
  deviceName?: string
}

export type SyncStage = 'choosing' | 'connecting' | 'measuring' | 'done'

export function bluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth
}

function waitForValue(ch: BluetoothRemoteGATTCharacteristic, timeoutMs: number): Promise<DataView> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ch.removeEventListener('characteristicvaluechanged', handler)
      reject(new Error('timeout'))
    }, timeoutMs)
    function handler(event: Event) {
      const value = (event.target as BluetoothRemoteGATTCharacteristic).value
      if (!value) return
      clearTimeout(timer)
      ch.removeEventListener('characteristicvaluechanged', handler)
      resolve(value)
    }
    ch.addEventListener('characteristicvaluechanged', handler)
    ch.startNotifications().catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function syncFromBluetooth(onStage?: (stage: SyncStage) => void, timeoutMs = 30_000): Promise<BluetoothReading> {
  const bt = navigator.bluetooth
  if (!bt) throw new Error('unsupported')
  onStage?.('choosing')
  const device = await bt.requestDevice({
    filters: [{ services: ['blood_pressure'] }, { services: ['heart_rate'] }, { services: ['health_thermometer'] }, { services: ['weight_scale'] }],
    optionalServices: ['battery_service', 'device_information'],
  })
  onStage?.('connecting')
  const server = await device.gatt!.connect()
  onStage?.('measuring')
  const reading: BluetoothReading = { deviceName: device.name }

  const read = async (service: string, characteristic: string, apply: (view: DataView) => void) => {
    try {
      const svc = await server.getPrimaryService(service)
      const ch = await svc.getCharacteristic(characteristic)
      apply(ch.properties.read ? await ch.readValue() : await waitForValue(ch, timeoutMs))
    } catch {
      /* this device does not offer that measurement */
    }
  }

  await Promise.all([
    read('blood_pressure', 'blood_pressure_measurement', (v) => {
      const bp = parseBloodPressure(v)
      if (bp.systolic) reading.bp_high = bp.systolic
      if (bp.diastolic) reading.bp_low = bp.diastolic
      if (bp.pulse) reading.heart_rate = bp.pulse
    }),
    read('heart_rate', 'heart_rate_measurement', (v) => {
      reading.heart_rate ??= parseHeartRate(v)
    }),
    read('health_thermometer', 'temperature_measurement', (v) => {
      const t = parseTemperature(v)
      if (t) reading.temperature = t
    }),
    read('weight_scale', 'weight_measurement', (v) => {
      const w = parseWeight(v)
      if (w) reading.weight = w
    }),
  ])
  server.disconnect()
  onStage?.('done')
  if (Object.keys(reading).length <= 1) throw new Error('no_reading')
  return reading
}

/** Plausible values near the last reading — only for browsers without Web Bluetooth. */
export function simulatedReading(last?: Partial<HealthLog> | null): BluetoothReading {
  const jitter = (base: number, spread: number) => Math.round(base + (Math.random() - 0.5) * spread)
  return {
    bp_high: jitter(last?.bp_high ?? 124, 8),
    bp_low: jitter(last?.bp_low ?? 78, 6),
    heart_rate: jitter(last?.heart_rate ?? 72, 6),
    temperature: Math.round(((last?.temperature ?? 36.5) + (Math.random() - 0.5) * 0.3) * 10) / 10,
    weight: Math.round(((last?.weight ?? 52.4) + (Math.random() - 0.5) * 0.4) * 10) / 10,
    deviceName: '模擬裝置',
  }
}
