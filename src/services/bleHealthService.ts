/**
 * PRAYANA — Real Web Bluetooth (BLE) Heart Rate Telemetry Service
 * ---------------------------------------------------------------
 * Connects directly to real BLE wearables implementing the standard
 * Bluetooth SIG Heart Rate Service (0x180D) & Measurement Characteristic (0x2A37).
 * Never fabricates paired hardware state; requires explicit user action or simulator toggle.
 */

interface MinimalBluetoothCharacteristic extends EventTarget {
  value?: DataView | null;
  startNotifications: () => Promise<MinimalBluetoothCharacteristic>;
  stopNotifications: () => Promise<MinimalBluetoothCharacteristic>;
}

interface MinimalBluetoothService {
  getCharacteristic: (uuid: string) => Promise<MinimalBluetoothCharacteristic>;
}

interface MinimalBluetoothGatt {
  connected: boolean;
  connect: () => Promise<MinimalBluetoothGatt>;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<MinimalBluetoothService>;
}

interface MinimalBluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: MinimalBluetoothGatt;
}

export interface BleConnectionHandle {
  deviceId: string;
  deviceName: string;
  disconnect: () => void;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Parses standard Bluetooth SIG Heart Rate Measurement (0x2A37) payload.
 */
export function parseHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Requests user selection of a real BLE heart_rate sensor and streams live BPM.
 */
export async function connectBleHeartRateDevice(
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void
): Promise<BleConnectionHandle> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth API is unavailable in this browser. Use Chrome/Edge over HTTPS or localhost, or switch to Manual / Demo Simulator mode.'
    );
  }

  const bt = (navigator as unknown as {
    bluetooth: {
      requestDevice: (options: {
        filters: Array<{ services: string[] }>;
      }) => Promise<MinimalBluetoothDevice>;
    };
  }).bluetooth;

  let device: MinimalBluetoothDevice;
  try {
    device = await bt.requestDevice({
      filters: [{ services: ['heart_rate'] }],
    });
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      throw new Error('Bluetooth pairing cancelled — no Heart Rate BLE device selected.');
    }
    throw new Error(err?.message || 'Unable to request Bluetooth device.');
  }

  if (!device.gatt) {
    throw new Error('Selected Bluetooth device does not expose a GATT server.');
  }

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');

  const deviceName = device.name || `BLE_HR_${device.id.slice(0, 6)}`;

  const handleNotification = (event: Event) => {
    const target = event.target as MinimalBluetoothCharacteristic;
    if (target.value) {
      const bpm = parseHeartRateMeasurement(target.value);
      if (bpm >= 30 && bpm <= 240) {
        onBpm(bpm, deviceName);
      }
    }
  };

  const handleDisconnected = () => {
    characteristic.removeEventListener('characteristicvaluechanged', handleNotification);
    device.removeEventListener('gattserverdisconnected', handleDisconnected);
    onDisconnect();
  };

  characteristic.addEventListener('characteristicvaluechanged', handleNotification);
  device.addEventListener('gattserverdisconnected', handleDisconnected);

  await characteristic.startNotifications();
  if (characteristic.value) {
    const initialBpm = parseHeartRateMeasurement(characteristic.value);
    if (initialBpm >= 30 && initialBpm <= 240) {
      onBpm(initialBpm, deviceName);
    }
  }

  return {
    deviceId: device.id,
    deviceName,
    disconnect: () => {
      try {
        characteristic.removeEventListener('characteristicvaluechanged', handleNotification);
        device.removeEventListener('gattserverdisconnected', handleDisconnected);
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
      } catch {
        // Ignore teardown errors
      }
    },
  };
}
