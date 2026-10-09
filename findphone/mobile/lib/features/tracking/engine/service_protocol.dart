/// Message names between the UI isolate and the Android service isolate.
abstract final class ServiceProtocol {
  // UI → service
  static const setMode = 'setMode';
  static const pause = 'pause';
  static const stop = 'stop';
  static const ping = 'ping';
  static const stopRing = 'stopRing';

  // service → UI
  static const ready = 'ready';
  static const snapshot = 'snapshot';
  static const paused = 'paused';
  static const stopped = 'stopped';
  static const ringing = 'ringing';

  // Must match MainActivity.kt, which creates the channel.
  static const notificationChannelId = 'findphone_sharing';
  static const notificationId = 4207;
}
