import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execAsync = promisify(exec);

/**
 * AdbService – thin wrapper around the `adb` CLI.
 *
 * Responsible for:
 *  - Verifying ADB availability
 *  - Running arbitrary ADB commands against a specific device serial
 *  - Parsing raw `adb devices` output
 */
export class AdbService {
  /** Cached path to the adb binary (resolved once per session) */
  private adbPath: string = 'adb';

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Verify that ADB is installed and on the PATH.
   * @returns true if ADB is reachable, false otherwise.
   */
  async isAdbAvailable(): Promise<boolean> {
    try {
      await execAsync(`${this.adbPath} version`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run `adb devices` and return the raw stdout string.
   */
  async getRawDeviceList(): Promise<string> {
    const { stdout } = await execAsync(`${this.adbPath} devices -l`);
    return stdout;
  }

  /**
   * Execute an ADB shell command on a specific device.
   *
   * @param serial  Device ADB serial (e.g. "emulator-5554")
   * @param command Shell command string (e.g. "cmd uimode night yes")
   * @returns stdout from the command.
   * @throws An error with a human-readable message on failure.
   */
  async runShellCommand(serial: string, command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`${this.adbPath} -s ${serial} shell ${command}`);
      return stdout.trim();
    } catch (err) {
      throw new Error(`ADB shell command failed on ${serial}: ${command}\n${String(err)}`);
    }
  }

  /**
   * Execute a top-level ADB command (not a shell command) on a device.
   *
   * @param serial  Device ADB serial
   * @param args    ADB arguments (e.g. ["exec-out", "screencap", "-p"])
   * @returns Buffer containing raw binary output.
   */
  async runRawCommand(serial: string, args: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { execFile } = require('child_process') as typeof import('child_process');
      const chunks: Buffer[] = [];
      const proc = execFile(this.adbPath, ['-s', serial, ...args]);

      proc.stdout?.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ADB command exited with code ${code}: adb -s ${serial} ${args.join(' ')}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });
    });
  }

  /**
   * Execute a screenrecord command on the device.
   * Records to a remote path, then pulls the file and removes it.
   *
   * @param serial     Device serial
   * @param remotePath Path on the device to store the recording temporarily
   * @param timeLimit  Max recording duration in seconds (default 180)
   */
  async startScreenRecord(serial: string, remotePath: string, timeLimit = 180): Promise<void> {
    await execAsync(
      `${this.adbPath} -s ${serial} shell screenrecord --time-limit ${timeLimit} ${remotePath}`
    );
  }

  /**
   * Pull a file from the device to a local destination.
   */
  async pullFile(serial: string, remotePath: string, localPath: string): Promise<void> {
    await execAsync(`${this.adbPath} -s ${serial} pull ${remotePath} ${localPath}`);
  }

  /**
   * Remove a file from the device filesystem.
   */
  async removeRemoteFile(serial: string, remotePath: string): Promise<void> {
    await execAsync(`${this.adbPath} -s ${serial} shell rm -f ${remotePath}`);
  }

  /**
   * Resolve a device's model name using ADB props.
   * Returns the raw serial if the prop is unavailable.
   */
  async getDeviceModel(serial: string): Promise<string> {
    try {
      const model = await this.runShellCommand(serial, 'getprop ro.product.model');
      return model || serial;
    } catch {
      return serial;
    }
  }

  // ---------------------------------------------------------------------------
  // Notification helpers
  // ---------------------------------------------------------------------------

  /** Show a VS Code error notification for ADB-not-found scenarios. */
  static notifyAdbNotFound(): void {
    vscode.window.showErrorMessage(
      'ADB not found. Please ensure Android SDK Platform Tools are installed and `adb` is in your PATH.',
      'Learn More'
    ).then((selection) => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://developer.android.com/tools/releases/platform-tools')
        );
      }
    });
  }
}
