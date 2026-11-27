/**
 * PRAYANA — Real Web Bluetooth (BLE) Health Telemetry Service
 * -----------------------------------------------------------
 * Primary scan filters strictly to standard BLE health services
 * (`heart_rate` 0x180D, `pulse_oximeter` 0x1822) so TVs/monitors and
 * non-health beacons are hidden from the browser picker.
 * Secondary "Scan All Nearby BLE" mode uses `acceptAllDevices: true` for
 * consumer watches (NoiseFit, Boat, Mi Band, Amazfit) that hide 0x180D.
 */

interface MinimalBluetoothCharacteristic extends EventTarget {
  value?: DataView | null;
  readValue?: () => Promise<DataView>;
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

export interface MinimalBluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: MinimalBluetoothGatt;
}

export interface BleTelemetryUpdate {
  spO2?: number;
  batteryLevel?: number;
}

export interface BleConnectionHandle {
  deviceId: string;
  deviceName: string;
  hasHeartRateGatt: boolean;
  batteryLevel?: number;
  spO2?: number;
  status: 'BLE_HR_STREAMING' | 'BLE_PROPRIETARY_LOCKED';
  disconnect: () => void;
}

export interface WebBluetoothDiagnostics {
  supported: boolean;
  available: boolean | null;
  reason: string | null;
}

const HEALTH_OPTIONAL_SERVICES = [
  'heart_rate',
  'pulse_oximeter',
  'health_thermometer',
  'battery_service',
  'device_information',
];

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Initiates `navigator.bluetooth.requestDevice(...)` synchronously inside an onClick
 * to preserve transient UserActivation.
 */
export function requestBleDevicePromise(scanAllNearby = false): Promise<MinimalBluetoothDevice> | undefined {
  if (!isWebBluetoothSupported()) return undefined;
  const bt = (navigator as unknown as {
    bluetooth?: {
      requestDevice: (options: Record<string, unknown>) => Promise<MinimalBluetoothDevice>;
    };
  }).bluetooth;
  if (!bt?.requestDevice) return undefined;

  if (scanAllNearby) {
    return bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        ...HEALTH_OPTIONAL_SERVICES,
        '0000fee0-0000-1000-8000-00805f9b34fb',
        '0000180d-0000-1000-8000-00805f9b34fb',
      ],
    });
  }

  return bt.requestDevice({
    filters: [{ services: ['heart_rate'] }, { services: ['pulse_oximeter'] }],
    optionalServices: HEALTH_OPTIONAL_SERVICES,
  });
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
        'Web Bluetooth API is disabled or unsupported in this browser. Enable chrome://flags/#enable-web-bluetooth or use Chrome / Edge over HTTPS or localhost, or use the Manual Simulator.',
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
            'Browser reports no active Bluetooth adapter or Web Bluetooth is disabled. Turn on system Bluetooth or use the Manual Simulator.',
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
    return '';
  }
  if (name === 'SecurityError') {
    return `Web Bluetooth blocked by browser security policy (SecurityError${msg ? `: ${msg}` : ''}). Ensure HTTPS/localhost.`;
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
 * Parses standard SFLOAT 16-bit IEEE-11073 used in PLX Spot-Check/Continuous SpO2 (0x2A5E / 0x2A5F).
 */
function parseSfloat(raw: number): number {
  let mantissa = raw & 0x0fff;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  let exponent = (raw >> 12) & 0x0f;
  if (exponent >= 0x08) exponent -= 0x10;
  return mantissa * Math.pow(10, exponent);
}

function parsePlxSpO2(value: DataView): number | null {
  if (value.byteLength < 3) return null;
  const spo2Raw = value.getUint16(1, true);
  const spo2 = Math.round(parseSfloat(spo2Raw));
  if (spo2 >= 70 && spo2 <= 100) return spo2;
  return null;
}

async function attachToGattDevice(
  device: MinimalBluetoothDevice,
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void,
  onTelemetry?: (data: BleTelemetryUpdate) => void
): Promise<BleConnectionHandle> {
  const deviceName = device.name?.trim() || `BLE_BAND_${device.id.slice(0, 6)}`;

  if (!device.gatt) {
    throw new Error(`Device "${deviceName}" does not expose a GATT server.`);
  }

  const server = await device.gatt.connect();

  let hasHeartRateGatt = false;
  let characteristic: MinimalBluetoothCharacteristic | null = null;
  let spo2Char: MinimalBluetoothCharacteristic | null = null;
  let batteryLevel: number | undefined;
  let spO2: number | undefined;

  const handleNotification = (event: Event) => {
    const target = event.target as MinimalBluetoothCharacteristic;
    if (target.value) {
      const bpm = parseHeartRateMeasurement(target.value);
      if (bpm >= 30 && bpm <= 240) {
        onBpm(bpm, deviceName);
      }
    }
  };

  const handleSpo2Notification = (event: Event) => {
    const target = event.target as MinimalBluetoothCharacteristic;
    if (target.value) {
      const parsed = parsePlxSpO2(target.value);
      if (parsed !== null) {
        spO2 = parsed;
        onTelemetry?.({ spO2: parsed });
      }
    }
  };

  const handleDisconnected = () => {
    try {
      characteristic?.removeEventListener('characteristicvaluechanged', handleNotification);
      spo2Char?.removeEventListener('characteristicvaluechanged', handleSpo2Notification);
    } catch {
      // ignore
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
    hasHeartRateGatt = false;
  }

  // Optional SpO2 (0x1822)
  try {
    const plxService = await server.getPrimaryService('pulse_oximeter');
    try {
      spo2Char = await plxService.getCharacteristic('plx_continuous_measurement');
    } catch {
      spo2Char = await plxService.getCharacteristic('plx_spot_check_measurement');
    }
    spo2Char.addEventListener('characteristicvaluechanged', handleSpo2Notification);
    await spo2Char.startNotifications();
    if (spo2Char.value) {
      const initialSpo2 = parsePlxSpO2(spo2Char.value);
      if (initialSpo2 !== null) {
        spO2 = initialSpo2;
        onTelemetry?.({ spO2 });
      }
    }
  } catch {
    // Optional service not exposed
  }

  // Optional Battery Service (0x180F -> 0x2A19)
  try {
    const batteryService = await server.getPrimaryService('battery_service');
    const batteryChar = await batteryService.getCharacteristic('battery_level');
    const val = batteryChar.readValue ? await batteryChar.readValue() : batteryChar.value;
    if (val && val.byteLength >= 1) {
      const pct = val.getUint8(0);
      if (pct >= 0 && pct <= 100) {
        batteryLevel = pct;
        onTelemetry?.({ batteryLevel: pct });
      }
    }
  } catch {
    // Optional service not exposed
  }

  return {
    deviceId: device.id,
    deviceName,
    hasHeartRateGatt,
    batteryLevel,
    spO2,
    status: hasHeartRateGatt ? 'BLE_HR_STREAMING' : 'BLE_PROPRIETARY_LOCKED',
    disconnect: () => {
      try {
        characteristic?.removeEventListener('characteristicvaluechanged', handleNotification);
        spo2Char?.removeEventListener('characteristicvaluechanged', handleSpo2Notification);
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

/**
 * Attempts silent auto-reconnection to previously permitted BLE health devices on mount.
 */
export async function tryReconnectPermittedBleDevice(
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void,
  onTelemetry?: (data: BleTelemetryUpdate) => void
): Promise<BleConnectionHandle | null> {
  if (!isWebBluetoothSupported()) return null;
  const bt = (navigator as unknown as {
    bluetooth?: { getDevices?: () => Promise<MinimalBluetoothDevice[]> };
  }).bluetooth;
  if (!bt?.getDevices) return null;

  try {
    const devices = await bt.getDevices();
    for (const dev of devices) {
      if (!dev.gatt) continue;
      try {
        return await attachToGattDevice(dev, onBpm, onDisconnect, onTelemetry);
      } catch {
        // Device not in range right now; try next permitted device
      }
    }
  } catch {
    // Ignore getDevices failures
  }
  return null;
}

/**
 * Consumes an ALREADY-initiated `requestDevice()` Promise (invoked synchronously inside an onClick)
 * or initiates `requestDevice()` directly when called without a pre-started Promise.
 * Returns `null` silently if the user cancels the browser device picker (`NotFoundError`).
 */
export async function connectBleHeartRateDevice(
  onBpm: (bpm: number, deviceName: string) => void,
  onDisconnect: () => void,
  preRequestedDevicePromise?: Promise<MinimalBluetoothDevice>,
  options?: {
    scanAllNearby?: boolean;
    onTelemetry?: (data: BleTelemetryUpdate) => void;
  }
): Promise<BleConnectionHandle | null> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth API is disabled or unavailable in this browser. Use Chrome/Edge over HTTPS or localhost, or use the Manual Simulator.'
    );
  }

  let device: MinimalBluetoothDevice;
  try {
    const requestPromise = preRequestedDevicePromise ?? requestBleDevicePromise(Boolean(options?.scanAllNearby));
    if (!requestPromise) {
      throw new Error('Web Bluetooth requestDevice is unavailable.');
    }
    device = await requestPromise;
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      return null;
    }
    console.warn('[Prayana BLE] requestDevice failed:', err?.name, err?.message);
    const formatted = formatBleError(err);
    if (!formatted) return null;
    throw new Error(formatted);
  }

  return attachToGattDevice(device, onBpm, onDisconnect, options?.onTelemetry);
}
