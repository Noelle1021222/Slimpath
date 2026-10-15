// Minimal Web Bluetooth typings (Chrome / Edge / Android). Safari has no
// Web Bluetooth, so every use is feature-detected.
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly value?: DataView
  readonly properties: { read: boolean; notify: boolean; indicate: boolean }
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  readValue(): Promise<DataView>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
}

interface BluetoothRequestDeviceFilter {
  services?: (string | number)[]
  name?: string
  namePrefix?: string
}

interface Bluetooth {
  getAvailability(): Promise<boolean>
  requestDevice(options: { filters: BluetoothRequestDeviceFilter[]; optionalServices?: (string | number)[] }): Promise<BluetoothDevice>
}

interface Navigator {
  readonly bluetooth?: Bluetooth
}
