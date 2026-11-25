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

export interface WebBluetoothDiagnostics {
  supported: boolean;
  available: boolean | null;
  reason: string | null;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Checks background Web Bluetooth adapter availability (`getAvailability`) for UI diagnostics ONLY.
 * Never call this ahead of `requestDevice()` in an `onClick` handler (keeps transient UserActivation intact).
 */
export async function checkWebBluetoothDiagnostics(): Promise<WebBluetoothDiagnostics> {
  if (!isWebBluetoothSupported()) {
    return {
      supported: false,
      available: false,
      reason:
        'Web Bluetooth API is disabled or unsupported in this browser. In Brave, enable brave://flags/#enable-web-bluetooth, or use Chrome / Edge over HTTPS or localhost, or toggle the Manual Simulator.',
    };
  }

  try {
    const bt = (navigator as unknown as {
      bluetooth?: { getAvailability?: () => Promise<boolean> };
    }).bluetooth;
    if (bt?.getAvailability) {
      const available = await bt.getAvailability();
      if (!available) {
        return {
          supported: true,
          available: false,
          reason:
            'Browser reports no active Bluetooth adapter or Web Bluetooth is disabled (e.g. Brave Shields/Flags: enable brave://flags/#enable-web-bluetooth, or turn on system Bluetooth).',
        };
      }
      return { supported: true, available: true, reason: null };
    }
    return { supported: true, available: null, reason: null };
  } catch (err: any) {
    return {
      supported: true,
      available: false,
      reason: err?.message || 'Unable to query Bluetooth adapter availability.',
    };
  }
}

export function formatBleError(err: any): string {
  const name = err?.name || '';
  const msg = err?.message || '';
  if (name === 'NotFoundError') {
    return 'Bluetooth pairing cancelled — no BLE wearable selected in the device picker.';
  }
  if (name === 'SecurityError') {
    return `Web Bluetooth blocked by browser security policy (SecurityError${msg ? `: ${msg}` : ''}). Ensure HTTPS/localhost and enable Web Bluetooth flags if using Brave.`;
  }
  if (name === 'NotAllowedError') {
    return `Bluetooth permission denied (NotAllowedError${msg ? `: ${msg}` : ''}).`;
  }
  return msg || 'Unable to request Bluetooth device.';
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
 * Consumes an ALREADY-initiated `requestDevice()` Promise (invoked synchronously inside an onClick)
 * or initiates `requestDevice()` directly when called without a pre-started Promise.
 */
export async function connectBleHeartRateDevice(
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void,
  preRequestedDevicePromise?: Promise<MinimalBluetoothDevice>
): Promise<BleConnectionHandle> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth API is disabled or unavailable in this browser. In Brave, enable brave://flags/#enable-web-bluetooth, or use Chrome/Edge over HTTPS or localhost, or use the Manual Simulator.'
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
    const requestPromise =
      preRequestedDevicePromise ??
      bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'heart_rate',
          'battery_service',
          'device_information',
          '0000fee0-0000-1000-8000-00805f9b34fb',
          '0000180d-0000-1000-8000-00805f9b34fb',
        ],
      });
    device = await requestPromise;
  } catch (err: any) {
    console.warn('[Prayana BLE] requestDevice failed:', err?.name, err?.message);
    throw new Error(formatBleError(err));
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
