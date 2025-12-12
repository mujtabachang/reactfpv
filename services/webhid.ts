// WebHID service for RadioMaster and other HID-based radio controllers

export interface HIDAxisValues {
  throttle: number; // 0 to 1
  yaw: number;      // -1 to 1
  pitch: number;    // -1 to 1
  roll: number;     // -1 to 1
  aux1?: number;
  aux2?: number;
}

// Raw channel data before mapping
export interface HIDRawChannels {
  channels: number[]; // Raw normalized values for each channel (-1 to 1)
}

// RadioMaster typically sends 8 channels as 16-bit values
// Each channel is 2 bytes (little-endian), range usually 1000-2000 (microseconds)
const CHANNEL_MIN = 1000;
const CHANNEL_MAX = 2000;
const CHANNEL_MID = 1500;

class WebHIDController {
  private device: HIDDevice | null = null;
  private rawChannels: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private listeners: Set<(channels: number[]) => void> = new Set();
  private _isConnected: boolean = false;
  private _isConnecting: boolean = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  get channels(): number[] {
    return [...this.rawChannels];
  }

  // Normalize channel value from microseconds (1000-2000) to -1 to 1
  private normalizeChannel(value: number): number {
    return ((value - CHANNEL_MID) / (CHANNEL_MAX - CHANNEL_MID)) * 1;
  }

  // Normalize throttle from microseconds (1000-2000) to 0 to 1
  private normalizeThrottle(value: number): number {
    return (value - CHANNEL_MIN) / (CHANNEL_MAX - CHANNEL_MIN);
  }

  async requestDevice(): Promise<boolean> {
    if (!('hid' in navigator)) {
      console.error('WebHID is not supported in this browser');
      return false;
    }

    try {
      // Request any HID device - RadioMaster controllers don't have consistent vendor IDs
      const devices = await navigator.hid.requestDevice({
        filters: [] // Allow any HID device
      });

      if (devices.length === 0) {
        console.log('No device selected');
        return false;
      }

      this.device = devices[0];
      return await this.connect();
    } catch (error) {
      console.error('Failed to request HID device:', error);
      return false;
    }
  }

  private async connect(): Promise<boolean> {
    if (!this.device) return false;
    if (this._isConnecting || this._isConnected) return this._isConnected;

    this._isConnecting = true;

    try {
      if (!this.device.opened) {
        await this.device.open();
      }

      this.device.addEventListener('inputreport', this.handleInputReport.bind(this));
      this._isConnected = true;
      this._isConnecting = false;

      console.log('Connected to:', this.device.productName);
      return true;
    } catch (error) {
      this._isConnecting = false;
      console.error('Failed to connect to HID device:', error);
      return false;
    }
  }

  private handleInputReport(event: HIDInputReportEvent): void {
    const { data } = event;

    // Log first few reports for debugging
    if (!this._debugLogged) {
      console.log('HID Report - byteLength:', data.byteLength, 'reportId:', event.reportId);
      const bytes: number[] = [];
      for (let i = 0; i < Math.min(32, data.byteLength); i++) {
        bytes.push(data.getUint8(i));
      }
      console.log('Raw bytes:', bytes);

      // Try 16-bit parsing
      if (data.byteLength >= 16) {
        const u16: number[] = [];
        for (let i = 0; i < Math.min(8, data.byteLength / 2); i++) {
          u16.push(data.getUint16(i * 2, true));
        }
        console.log('As 16-bit LE:', u16);
      }
      this._debugLogged = true;
      setTimeout(() => { this._debugLogged = false; }, 2000); // Re-log every 2 seconds
    }

    // Try multiple parsing strategies
    let parsed = false;

    // RadioMaster Pocket format: 19 bytes, standard USB joystick HID report
    // Bytes layout appears to be: axes at specific byte positions
    // Based on observed data: bytes 4, 6, 8, 10 contain axis data (8-bit each)
    if (data.byteLength === 19 || data.byteLength >= 11) {
      // Try RadioMaster Pocket / USB Joystick format
      // Standard USB HID joystick: X, Y, Z, Rz typically at bytes 0-3 or with offset
      const channels = this.parseUSBJoystick(data);
      if (channels) {
        this.rawChannels = channels;
        parsed = true;
      }
    }

    // Try standard RC 16-bit format (1000-2000 range)
    if (!parsed && data.byteLength >= 16) {
      const channels: number[] = [];
      for (let i = 0; i < Math.min(8, data.byteLength / 2); i++) {
        channels.push(data.getUint16(i * 2, true));
      }
      const isValidRange = channels.every(ch => ch >= 900 && ch <= 2100);
      if (isValidRange) {
        this.rawChannels = channels.map(ch => this.normalizeChannel(ch));
        parsed = true;
      }
    }

    // Fallback: try simple 8-bit parsing from start
    if (!parsed && data.byteLength >= 4) {
      this.parseAs8Bit(data);
    }

    // Notify listeners with raw channels
    this.listeners.forEach(listener => listener(this.rawChannels));
  }

  private _debugLogged = false;

  // Parse USB HID Joystick format (RadioMaster Pocket and similar)
  private parseUSBJoystick(data: DataView): number[] | null {
    // RadioMaster Pocket sends 19 bytes
    // Observed data pattern at center sticks:
    // [0, 0, 0, 0, 4, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0]
    // When sticks moved: bytes 7, 8 change (seen values like 23, 8)
    // Bytes 4, 6, 10 seem to have value 4 at center

    const channels: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

    if (data.byteLength === 19) {
      // RadioMaster Pocket specific format
      // It appears to use 16-bit little-endian values starting at byte 4
      // Let's read 8 channels as 16-bit LE starting from byte 3
      for (let i = 0; i < 8; i++) {
        const offset = 3 + (i * 2);
        if (offset + 1 < data.byteLength) {
          const val = data.getUint16(offset, true);
          // These seem to be small values (0-255 range?), normalize
          channels[i] = (val / 127.5) - 1;
        }
      }

      // Check if reasonable
      const hasMovement = channels.some(ch => Math.abs(ch) > 0.01);
      if (hasMovement) {
        return channels;
      }

      // Alternative: Maybe it's bytes 4-11 as individual 8-bit values
      // bytes: [4]:CH1, [5]:?, [6]:CH2, [7]:CH3, [8]:CH4, [9]:?, [10]:CH5, ...
      const axisBytes = [4, 6, 7, 8, 10, 11, 12, 13];
      for (let i = 0; i < 8; i++) {
        const byteIdx = axisBytes[i];
        if (byteIdx < data.byteLength) {
          const val = data.getUint8(byteIdx);
          channels[i] = (val / 127.5) - 1; // Normalize 0-255 to -1 to 1
        }
      }

      return channels;
    }

    // Generic USB joystick - try bytes 1-8
    if (data.byteLength >= 9) {
      for (let i = 0; i < 8; i++) {
        const val = data.getUint8(i + 1);
        channels[i] = (val / 127.5) - 1;
      }
      return channels;
    }

    return null;
  }

  private parseAs8Bit(data: DataView): void {
    // Some HID devices send 8-bit values (0-255)
    const channels: number[] = [];
    for (let i = 0; i < Math.min(8, data.byteLength); i++) {
      channels.push(data.getUint8(i));
    }

    // Normalize 0-255 to -1 to 1
    this.rawChannels = channels.map(ch => (ch / 127.5) - 1);
  }

  subscribe(listener: (channels: number[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.close();
      } catch (error) {
        console.error('Error closing device:', error);
      }
      this.device = null;
      this._isConnected = false;
      this.rawChannels = [0, 0, 0, 0, 0, 0, 0, 0];
    }
  }

  // Try to reconnect to previously paired devices
  async tryReconnect(): Promise<boolean> {
    if (!('hid' in navigator)) return false;

    try {
      const devices = await navigator.hid.getDevices();
      if (devices.length > 0) {
        this.device = devices[0];
        return await this.connect();
      }
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
    return false;
  }
}

// Singleton instance
export const hidController = new WebHIDController();
