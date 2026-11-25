/**
 * PRAYANA — Real Web Bluetooth (BLE) Heart Rate Telemetry Service
 * ---------------------------------------------------------------
 * Uses `acceptAllDevices: true` so consumer smartwatches & fitbands
 * (Boat, Noise, Mi Band, Amazfit, Galaxy Watch, Fitbit) appear in Chrome's
 * Bluetooth picker even when they do not advertise 0x180D pre-pairing.
 *
 * After connecting to GATT:
 *  - Checks for Heart Rate Service (0x180D) -> Heart Rate Measurement (0x2A37)
 *  - If present: streams real live BPM notifications
 *  - If absent/locked: reports `hasHeartRateGatt: false` cleanly so the UI can
 *    display `[ CONNECTED: <Device> · PROPRIETARY HR LOCKED ]` and allow manual
 *    entry without ever faking hardware telemetry.
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
  hasHeartRateGatt: boolean;
  status: 'BLE_HR_STREAMING' | 'BLE_PROPRIETARY_LOCKED';
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
 * Opens Chrome's Bluetooth picker for all nearby BLE watches/bands and
 * inspects GATT 0x180D -> 0x2A37 availability.
 */
export async function connectBleHeartRateDevice(
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void
): Promise<BleConnectionHandle> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth API is unavailable in this browser. Use Chrome/Edge over HTTPS or localhost, or toggle the Manual Simulator.'
    );
  }

  const bt = (navigator as unknown as {
    bluetooth: {
      requestDevice: (options: {
        acceptAllDevices: boolean;
        optionalServices?: string[];
      }) => Promise<MinimalBluetoothDevice>;
    };
  }).bluetooth;

  let device: MinimalBluetoothDevice;
  try {
    device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'heart_rate',
        'battery_service',
        'device_information',
        '0000fee0-0000-1000-8000-00805f9b34fb', // Xiaomi / Amazfit / Huami bands
        '0000180d-0000-1000-8000-00805f9b34fb',
      ],
    });
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      throw new Error('Bluetooth pairing cancelled — no BLE device selected.');
    }
    throw new Error(err?.message || 'Unable to request Bluetooth device.');
  }

  const deviceName = device.name?.trim() || `BLE_BAND_${device.id.slice(0, 6)}`;

  if (!device.gatt) {
    throw new Error(`Device "${deviceName}" does not expose a GATT server.`);
  }

  const server = await device.gatt.connect();

  let hasHeartRateGatt = false;
  let characteristic: MinimalBluetoothCharacteristic | null = null;

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
    if (characteristic) {
      try {
        characteristic.removeEventListener('characteristicvaluechanged', handleNotification);
      } catch {
        // ignore
      }
    }
    device.removeEventListener('gattserverdisconnected', handleDisconnected);
    onDisconnect();
  };

  device.addEventListener('gattserverdisconnected', handleDisconnected);

  try {
    const service = await server.getPrimaryService('heart_rate');
    characteristic = await service.getCharacteristic('heart_rate_measurement');
    characteristic.addEventListener('characteristicvaluechanged', handleNotification);
    await characteristic.startNotifications();
    hasHeartRateGatt = true;

    if (characteristic.value) {
      const initialBpm = parseHeartRateMeasurement(characteristic.value);
      if (initialBpm >= 30 && initialBpm <= 240) {
        onBpm(initialBpm, deviceName);
      }
    }
  } catch {
    // Consumer watch (Mi Band / Noise / Boat / Apple Watch / Galaxy) paired via BLE
    // but locks HR notifications behind proprietary companion app service.
    hasHeartRateGatt = false;
  }

  return {
    deviceId: device.id,
    deviceName,
    hasHeartRateGatt,
    status: hasHeartRateGatt ? 'BLE_HR_STREAMING' : 'BLE_PROPRIETARY_LOCKED',
    disconnect: () => {
      try {
        if (characteristic) {
          characteristic.removeEventListener('characteristicvaluechanged', handleNotification);
        }
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
